<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\ReviewStatus;
use App\Http\Controllers\Api\V1\Admin\Concerns\AdminCrud;
use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReviewController extends Controller
{
    use AdminCrud;

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::enum(ReviewStatus::class)],
            'course_id' => ['nullable', 'integer'],
        ]);

        $page = Review::query()
            ->with(['user:id,name,email', 'course:id,title,slug'])
            ->when($filters['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->when($filters['course_id'] ?? null, fn ($q, $c) => $q->where('course_id', $c))
            ->latest('id')
            ->paginate($this->perPage($request))
            ->withQueryString();

        return $this->paginated($page, fn (Review $r) => self::present($r));
    }

    public function update(Request $request, Review $review): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::enum(ReviewStatus::class)]]);

        $review->forceFill([
            'status' => $data['status'],
            'moderated_by' => $request->user()->id,
            'moderated_at' => now(),
        ])->save();
        $this->audit('review.moderated', $review, ['status' => $data['status']]);

        return response()->json(['message' => __('admin.review_moderated'), 'data' => self::present($review->load(['user:id,name,email', 'course:id,title,slug']))]);
    }

    public function destroy(Review $review): JsonResponse
    {
        $review->delete();
        $this->audit('review.deleted', $review);

        return response()->json(['message' => __('admin.deleted')]);
    }

    /** @return array<string, mixed> */
    public static function present(Review $r): array
    {
        return [
            'id' => $r->id,
            'rating' => $r->rating,
            'comment' => $r->comment,
            'status' => ['value' => $r->status->value, 'label' => $r->status->label()],
            'user' => $r->user ? ['id' => $r->user->id, 'name' => $r->user->name, 'email' => $r->user->email] : null,
            'course' => $r->course ? ['id' => $r->course->id, 'title' => $r->course->title, 'slug' => $r->course->slug] : null,
            'created_at' => $r->created_at?->toIso8601String(),
            'moderated_at' => $r->moderated_at?->toIso8601String(),
        ];
    }
}
