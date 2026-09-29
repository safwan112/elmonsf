<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\Admin\Concerns\AdminCrud;
use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ContactMessageController extends Controller
{
    use AdminCrud;

    private const STATUSES = ['new', 'read', 'replied', 'archived'];

    public function index(Request $request): JsonResponse
    {
        $request->validate(['status' => ['nullable', Rule::in(self::STATUSES)]]);

        $page = ContactMessage::query()
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->latest('id')
            ->paginate($this->perPage($request))
            ->withQueryString();

        return $this->paginated($page, fn (ContactMessage $m) => $this->present($m));
    }

    public function update(Request $request, ContactMessage $message): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(self::STATUSES)]]);
        $message->update($data);

        return response()->json(['data' => $this->present($message)]);
    }

    /** @return array<string, mixed> */
    private function present(ContactMessage $m): array
    {
        return [
            'id' => $m->id,
            'name' => $m->name,
            'email' => $m->email,
            'phone' => $m->phone,
            'subject' => $m->subject,
            'message' => $m->message,
            'status' => $m->status,
            'created_at' => $m->created_at?->toIso8601String(),
        ];
    }
}
