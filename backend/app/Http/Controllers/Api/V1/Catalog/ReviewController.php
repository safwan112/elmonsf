<?php

namespace App\Http\Controllers\Api\V1\Catalog;

use App\Enums\ReviewStatus;
use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public course reviews (approved only) and a student's own review.
 */
class ReviewController extends Controller
{
    public function index(string $slug): JsonResponse
    {
        $course = Course::query()->published()->where('slug', $slug)->firstOrFail();

        $page = $course->reviews()
            ->approved()
            ->with('user:id,name,avatar_path')
            ->latest('id')
            ->paginate(10);

        return response()->json([
            'data' => $page->getCollection()->map(fn (Review $r) => [
                'id' => $r->id,
                'rating' => $r->rating,
                'comment' => $r->comment,
                // First name only: reviews are public.
                'author' => ['name' => explode(' ', trim((string) $r->user?->name))[0] ?: 'طالب', 'avatar_url' => $r->user?->avatarUrl()],
                'created_at' => $r->created_at?->toIso8601String(),
            ])->values(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
            'summary' => ['average' => $course->rating_avg, 'count' => $course->rating_count],
        ]);
    }

    public function mine(Request $request, string $slug): JsonResponse
    {
        $course = Course::query()->published()->where('slug', $slug)->firstOrFail();
        $review = Review::query()->where('user_id', $request->user()->id)->where('course_id', $course->id)->first();

        return response()->json(['data' => [
            'can_review' => $this->hasEnrollment($request->user()->id, $course->id),
            'review' => $review ? $this->presentOwn($review) : null,
        ]]);
    }

    /** Create or update the student's review; it goes back to moderation. */
    public function upsert(Request $request, string $slug): JsonResponse
    {
        $course = Course::query()->published()->where('slug', $slug)->firstOrFail();
        $user = $request->user();

        if (! $this->hasEnrollment($user->id, $course->id)) {
            throw new DomainException(__('catalog.review_requires_enrollment'), 'review_requires_enrollment', 403);
        }

        $data = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);
        // Plain text only (the SPA renders it as text, never as HTML).
        $data['comment'] = isset($data['comment']) ? (trim(strip_tags($data['comment'])) ?: null) : null;

        $review = Review::query()->updateOrCreate(
            ['user_id' => $user->id, 'course_id' => $course->id],
            [...$data, 'status' => ReviewStatus::Pending, 'moderated_by' => null, 'moderated_at' => null],
        );

        return response()->json([
            'message' => __('catalog.review_submitted'),
            'data' => $this->presentOwn($review),
        ], $review->wasRecentlyCreated ? 201 : 200);
    }

    private function hasEnrollment(int $userId, int $courseId): bool
    {
        return Enrollment::query()->where('user_id', $userId)->where('course_id', $courseId)->exists();
    }

    /** @return array<string, mixed> */
    private function presentOwn(Review $r): array
    {
        return [
            'id' => $r->id,
            'rating' => $r->rating,
            'comment' => $r->comment,
            'status' => ['value' => $r->status->value, 'label' => $r->status->label()],
            'updated_at' => $r->updated_at?->toIso8601String(),
        ];
    }
}
