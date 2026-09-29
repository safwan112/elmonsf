<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\Admin\Concerns\AdminCrud;
use App\Http\Controllers\Controller;
use App\Jobs\SendBroadcast;
use App\Models\Broadcast;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BroadcastController extends Controller
{
    use AdminCrud;

    public function index(Request $request): JsonResponse
    {
        $page = Broadcast::query()->with(['sender:id,name', 'course:id,title'])->latest('id')->paginate($this->perPage($request));

        return $this->paginated($page, fn (Broadcast $b) => $this->present($b));
    }

    /** How many users an audience reaches (before sending). */
    public function preview(Request $request): JsonResponse
    {
        $broadcast = new Broadcast($this->audience($request));

        return response()->json(['data' => [
            'recipients' => $broadcast->recipients()->count(),
            'email_recipients' => $broadcast->recipients()->where('marketing_emails', true)->count(),
        ]]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'body' => ['required', 'string', 'max:2000'],
            // In-app links only.
            'url' => ['nullable', 'string', 'max:255', 'regex:#^/(?!/)#'],
            'send_email' => ['sometimes', 'boolean'],
        ]) + $this->audience($request);

        $broadcast = Broadcast::query()->create([
            ...$data,
            'title' => trim(strip_tags($data['title'])),
            'body' => trim(strip_tags($data['body'])),
            'sent_by' => $request->user()->id,
            'status' => 'queued',
        ])->refresh();

        SendBroadcast::dispatch($broadcast);
        $this->audit('broadcast.queued', $broadcast, ['audience' => $broadcast->audience, 'email' => $broadcast->send_email]);

        return response()->json([
            'message' => __('admin.broadcast_queued'),
            'data' => $this->present($broadcast->refresh()->load(['sender:id,name', 'course:id,title'])),
        ], 201);
    }

    /** @return array{audience: string, course_id: int|null} */
    private function audience(Request $request): array
    {
        $data = $request->validate([
            'audience' => ['required', Rule::in(Broadcast::AUDIENCES)],
            'course_id' => ['nullable', 'required_if:audience,course', 'integer', 'exists:courses,id'],
        ]);

        return ['audience' => $data['audience'], 'course_id' => $data['audience'] === 'course' ? (int) $data['course_id'] : null];
    }

    /** @return array<string, mixed> */
    private function present(Broadcast $b): array
    {
        return [
            'id' => $b->id,
            'title' => $b->title,
            'body' => $b->body,
            'url' => $b->url,
            'audience' => ['value' => $b->audience, 'label' => $b->audienceLabel()],
            'course' => $b->course ? ['id' => $b->course->id, 'title' => $b->course->title] : null,
            'send_email' => $b->send_email,
            'status' => $b->status,
            'recipients_count' => $b->recipients_count,
            'sender' => $b->sender ? ['id' => $b->sender->id, 'name' => $b->sender->name] : null,
            'sent_at' => $b->sent_at?->toIso8601String(),
            'created_at' => $b->created_at?->toIso8601String(),
        ];
    }
}
