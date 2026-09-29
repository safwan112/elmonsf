<?php

namespace App\Services\Learning;

use App\Models\Lesson;
use App\Models\LessonProgress;
use App\Models\User;

/**
 * Lesson progress and per-course completion. Only published lessons count.
 */
class CourseProgress
{
    /**
     * @param  list<int>  $courseIds
     * @return array<int, array{completed: int, total: int, percent: int, last_lesson_id: int|null}>
     */
    public function forCourses(User $user, array $courseIds): array
    {
        if ($courseIds === []) {
            return [];
        }

        $totals = Lesson::query()
            ->whereIn('course_id', $courseIds)
            ->where('is_published', true)
            ->groupBy('course_id')
            ->selectRaw('course_id, count(*) as aggregate')
            ->pluck('aggregate', 'course_id');

        $completed = LessonProgress::query()
            ->where('user_id', $user->id)
            ->whereIn('lesson_progress.course_id', $courseIds)
            ->whereNotNull('completed_at')
            ->whereHas('lesson', fn ($q) => $q->where('is_published', true))
            ->groupBy('lesson_progress.course_id')
            ->selectRaw('lesson_progress.course_id, count(*) as aggregate')
            ->pluck('aggregate', 'course_id');

        $last = LessonProgress::query()
            ->where('user_id', $user->id)
            ->whereIn('course_id', $courseIds)
            ->whereNotNull('last_viewed_at')
            ->orderByDesc('last_viewed_at')
            ->get(['course_id', 'lesson_id'])
            ->unique('course_id')
            ->pluck('lesson_id', 'course_id');

        $out = [];
        foreach ($courseIds as $id) {
            $total = (int) ($totals[$id] ?? 0);
            $done = (int) ($completed[$id] ?? 0);
            $out[$id] = [
                'completed' => $done,
                'total' => $total,
                'percent' => $total > 0 ? (int) floor($done * 100 / $total) : 0,
                'last_lesson_id' => isset($last[$id]) ? (int) $last[$id] : null,
            ];
        }

        return $out;
    }

    /**
     * Record viewing a lesson and, optionally, the playback position and
     * completion. Completion only changes when explicitly requested, so
     * re-watching a finished lesson keeps it completed.
     */
    public function record(User $user, Lesson $lesson, ?int $positionSeconds = null, ?bool $completed = null): LessonProgress
    {
        $progress = LessonProgress::query()->firstOrNew(['user_id' => $user->id, 'lesson_id' => $lesson->id]);
        $progress->course_id = $lesson->course_id;
        $progress->last_viewed_at = now();

        if ($positionSeconds !== null) {
            $max = $lesson->duration_seconds > 0 ? $lesson->duration_seconds : $positionSeconds;
            $progress->position_seconds = max(0, min($positionSeconds, $max));
        }
        if ($completed === true && $progress->completed_at === null) {
            $progress->completed_at = now();
        } elseif ($completed === false) {
            $progress->completed_at = null;
        }

        $progress->save();

        return $progress;
    }
}
