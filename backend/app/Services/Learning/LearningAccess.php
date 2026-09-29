<?php

namespace App\Services\Learning;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Exam;
use App\Models\Lesson;
use App\Models\ProductEntitlement;
use App\Models\QuestionBank;
use App\Models\User;

/**
 * Single source of truth for "may this user use this learning content?".
 * Policies delegate here; results are memoised per request.
 *
 * - Admins can open everything (for previewing and support).
 * - Instructors can open the courses they teach.
 * - Students need a current enrollment (course content) or an active
 *   product entitlement (products such as question banks).
 * - Gated content with neither a course nor a product is free for any
 *   signed-in user.
 */
class LearningAccess
{
    /** @var array<string, bool> */
    private array $memo = [];

    public function hasCourse(User $user, int $courseId): bool
    {
        return $this->memo["c:{$user->id}:{$courseId}"] ??= $user->isAdmin()
            || $this->teaches($user, $courseId)
            || Enrollment::query()->where('user_id', $user->id)->where('course_id', $courseId)->current()->exists();
    }

    public function hasProduct(User $user, int $productId): bool
    {
        return $this->memo["p:{$user->id}:{$productId}"] ??= $user->isAdmin()
            || ProductEntitlement::query()
                ->where('user_id', $user->id)
                ->where('product_id', $productId)
                ->whereNull('revoked_at')
                ->exists();
    }

    public function canViewLesson(User $user, Lesson $lesson): bool
    {
        $course = $lesson->loadMissing('course')->course;
        $privileged = $user->isAdmin() || $this->teaches($user, $lesson->course_id);

        if (! $privileged && (! $lesson->is_published || ! $course instanceof Course || ! $course->isPublished())) {
            return false;
        }

        return $lesson->is_preview || $this->hasCourse($user, $lesson->course_id);
    }

    public function canUseGated(User $user, ?int $courseId, ?int $productId): bool
    {
        if ($courseId === null && $productId === null) {
            return true;
        }

        return ($courseId !== null && $this->hasCourse($user, $courseId))
            || ($productId !== null && $this->hasProduct($user, $productId));
    }

    public function canTakeExam(User $user, Exam $exam): bool
    {
        if (! $exam->isPublished() && ! $user->isAdmin()) {
            return false;
        }

        return $this->canUseGated($user, $exam->course_id, $exam->product_id);
    }

    public function canUseBank(User $user, QuestionBank $bank): bool
    {
        if (! $bank->is_active && ! $user->isAdmin()) {
            return false;
        }

        return $this->canUseGated($user, $bank->course_id, $bank->product_id);
    }

    /**
     * Course and product ids the user can currently use (for listing gated
     * content without an N+1 of access checks).
     *
     * @return array{courses: list<int>, products: list<int>}
     */
    public function grants(User $user): array
    {
        return [
            'courses' => Enrollment::query()->where('user_id', $user->id)->current()->pluck('course_id')->map(fn ($id) => (int) $id)->all(),
            'products' => ProductEntitlement::query()->where('user_id', $user->id)->whereNull('revoked_at')->pluck('product_id')->map(fn ($id) => (int) $id)->all(),
        ];
    }

    private function teaches(User $user, int $courseId): bool
    {
        return $this->memo["t:{$user->id}:{$courseId}"] ??= Course::query()
            ->whereKey($courseId)
            ->whereHas('instructor', fn ($q) => $q->where('user_id', $user->id))
            ->exists();
    }
}
