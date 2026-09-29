<?php

namespace App\Http\Controllers\Api\V1\Learning;

use App\Exceptions\DomainException;
use App\Http\Controllers\Api\V1\Learning\Concerns\GuardsLearningAccess;
use App\Http\Controllers\Controller;
use App\Http\Resources\Catalog\CourseListResource;
use App\Models\Attachment;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Exam;
use App\Models\Lesson;
use App\Models\LessonProgress;
use App\Models\Section;
use App\Services\Learning\CourseProgress;
use App\Services\Learning\LearningAccess;
use App\Support\RichText;
use App\Support\VideoEmbed;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The student's course player: curriculum with progress, lesson content
 * (only for enrolled students), progress tracking and attachments.
 */
class LearningController extends Controller
{
    use GuardsLearningAccess;

    public function __construct(
        private readonly LearningAccess $access,
        private readonly CourseProgress $progress,
    ) {}

    public function course(Request $request, int $courseId): JsonResponse
    {
        $user = $request->user();
        $course = Course::query()->with(['category', 'instructor'])->findOrFail($courseId);

        if (! $this->access->hasCourse($user, $course->id)) {
            throw new DomainException(__('learning.locked'), 'content_locked', 403);
        }

        $course->load(['sections.lessons' => fn ($q) => $q->where('is_published', true)]);
        $done = LessonProgress::query()
            ->where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->get(['lesson_id', 'completed_at', 'position_seconds'])
            ->keyBy('lesson_id');

        $summary = $this->progress->forCourses($user, [$course->id])[$course->id];
        $ordered = $course->sections->flatMap(fn (Section $s) => $s->lessons);
        $next = $ordered->first(fn (Lesson $l) => ! $done->get($l->id)?->completed_at);

        $enrollment = Enrollment::query()->where('user_id', $user->id)->where('course_id', $course->id)->first();
        $exams = Exam::query()->published()->where('course_id', $course->id)->orderBy('sort_order')->get(['id', 'title', 'duration_minutes', 'questions_count']);

        return response()->json(['data' => [
            'course' => new CourseListResource($course),
            'enrollment' => $enrollment ? [
                'expires_at' => $enrollment->expires_at?->toIso8601String(),
                'is_active' => $enrollment->isCurrent(),
            ] : null,
            'progress' => $summary,
            'next_lesson_id' => ($next ?? $ordered->first())?->id,
            'curriculum' => $course->sections->map(fn (Section $section) => [
                'id' => $section->id,
                'title' => $section->title,
                'lessons' => $section->lessons->map(fn (Lesson $lesson) => [
                    'id' => $lesson->id,
                    'title' => $lesson->title,
                    'type' => ['value' => $lesson->type->value, 'label' => $lesson->type->label()],
                    'duration_seconds' => $lesson->duration_seconds,
                    'is_completed' => (bool) $done->get($lesson->id)?->completed_at,
                ])->values(),
            ])->values(),
            'exams' => $exams->map(fn (Exam $e) => [
                'id' => $e->id,
                'title' => $e->title,
                'duration_minutes' => $e->duration_minutes,
                'questions_count' => $e->questions_count,
            ]),
        ]]);
    }

    public function lesson(Request $request, Lesson $lesson): JsonResponse
    {
        $lesson->load(['course', 'section', 'attachments']);
        $this->ensureAllowed('view', $lesson);

        $user = $request->user();
        $progress = $this->progress->record($user, $lesson);

        // Neighbours in curriculum order (published lessons only).
        $ordered = Lesson::query()
            ->where('lessons.course_id', $lesson->course_id)
            ->where('lessons.is_published', true)
            ->join('sections', 'sections.id', '=', 'lessons.section_id')
            ->orderBy('sections.sort_order')->orderBy('sections.id')
            ->orderBy('lessons.sort_order')->orderBy('lessons.id')
            ->pluck('lessons.id')
            ->values();
        $index = $ordered->search($lesson->id);
        $prev = $index !== false && $index > 0 ? $ordered[$index - 1] : null;
        $next = $index !== false ? $ordered->get($index + 1) : null;

        return response()->json(['data' => [
            'id' => $lesson->id,
            'title' => $lesson->title,
            'type' => ['value' => $lesson->type->value, 'label' => $lesson->type->label()],
            'duration_seconds' => $lesson->duration_seconds,
            'content_html' => RichText::toHtml($lesson->content),
            'video_embed_url' => VideoEmbed::url($lesson->video_provider, $lesson->video_ref),
            'attachments' => $lesson->attachments->map(fn (Attachment $a) => [
                'id' => $a->id,
                'title' => $a->title,
                'mime_type' => $a->mime_type,
                'size_bytes' => $a->size_bytes,
            ])->values(),
            'course' => ['id' => $lesson->course->id, 'title' => $lesson->course->title, 'slug' => $lesson->course->slug],
            'section' => ['id' => $lesson->section->id, 'title' => $lesson->section->title],
            'is_enrolled' => $this->access->hasCourse($user, $lesson->course_id),
            'prev_lesson_id' => $prev,
            'next_lesson_id' => $next,
            'progress' => [
                'completed_at' => $progress->completed_at?->toIso8601String(),
                'position_seconds' => $progress->position_seconds,
            ],
        ]]);
    }

    public function updateProgress(Request $request, Lesson $lesson): JsonResponse
    {
        $this->ensureAllowed('view', $lesson);

        $data = $request->validate([
            'position_seconds' => ['nullable', 'integer', 'min:0', 'max:86400'],
            'completed' => ['nullable', 'boolean'],
        ]);

        $progress = $this->progress->record(
            $request->user(),
            $lesson,
            $data['position_seconds'] ?? null,
            array_key_exists('completed', $data) && $data['completed'] !== null ? (bool) $data['completed'] : null,
        );
        $summary = $this->progress->forCourses($request->user(), [$lesson->course_id])[$lesson->course_id];

        return response()->json([
            'message' => ($data['completed'] ?? false) ? __('learning.lesson_completed') : __('learning.progress_saved'),
            'data' => [
                'lesson_id' => $lesson->id,
                'completed_at' => $progress->completed_at?->toIso8601String(),
                'position_seconds' => $progress->position_seconds,
                'course_progress' => $summary,
            ],
        ]);
    }

    public function attachment(Attachment $attachment): StreamedResponse
    {
        $attachment->load('lesson.course');
        $this->ensureAllowed('view', $attachment->lesson);

        $disk = Storage::disk($attachment->disk);
        if (! $disk->exists($attachment->path)) {
            throw new DomainException(__('learning.attachment_missing'), 'attachment_missing', 404);
        }

        $extension = pathinfo($attachment->path, PATHINFO_EXTENSION);
        $name = $attachment->title.($extension ? ".{$extension}" : '');

        return $disk->download($attachment->path, $name, ['Cache-Control' => 'private, no-store']);
    }
}
