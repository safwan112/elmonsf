<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\LessonType;
use App\Http\Controllers\Api\V1\Admin\Concerns\AdminCrud;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminCourseResource;
use App\Models\Attachment;
use App\Models\Course;
use App\Models\CoursePlan;
use App\Models\Lesson;
use App\Models\OrderItem;
use App\Models\Section;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Plans, sections, lessons and attachments of a course. Every action is
 * authorized against the parent course (admins, or its instructor).
 */
class CurriculumController extends Controller
{
    use AdminCrud;

    // ---- Plans ---------------------------------------------------------

    public function storePlan(Request $request, Course $course): JsonResponse
    {
        CourseController::authorizeCourse($request->user(), $course);
        $data = $this->planData($request);

        $plan = DB::transaction(function () use ($course, $data) {
            $plan = $course->plans()->create($data + ['currency' => config('platform.commerce.currency', 'SAR')]);
            $this->singleDefault($plan);

            return $plan;
        });
        $this->audit('course.plan_created', $course, ['plan_id' => $plan->id]);

        return response()->json(['data' => AdminCourseResource::plan($plan->refresh())], 201);
    }

    public function updatePlan(Request $request, CoursePlan $plan): JsonResponse
    {
        CourseController::authorizeCourse($request->user(), $plan->loadMissing('course')->course);
        $data = $this->planData($request, true);

        DB::transaction(function () use ($plan, $data) {
            $plan->update($data);
            $this->singleDefault($plan);
        });
        $this->audit('course.plan_updated', $plan->loadMissing('course')->course, ['plan_id' => $plan->id, 'fields' => array_keys($data)]);

        return response()->json(['data' => AdminCourseResource::plan($plan->refresh())]);
    }

    public function destroyPlan(Request $request, CoursePlan $plan): JsonResponse
    {
        CourseController::authorizeCourse($request->user(), $plan->loadMissing('course')->course);

        // Sold plans stay for order history; they are only deactivated.
        $sold = OrderItem::query()->where('purchasable_type', 'course_plan')->where('purchasable_id', $plan->id)->exists();
        if ($sold) {
            $plan->update(['is_active' => false, 'is_default' => false]);
            $this->audit('course.plan_deactivated', $plan->loadMissing('course')->course, ['plan_id' => $plan->id]);

            return response()->json(['message' => __('admin.deactivated'), 'data' => AdminCourseResource::plan($plan)]);
        }

        $plan->delete();
        $this->audit('course.plan_deleted', $plan->loadMissing('course')->course, ['plan_id' => $plan->id]);

        return response()->json(['message' => __('admin.deleted')]);
    }

    // ---- Sections ------------------------------------------------------

    public function storeSection(Request $request, Course $course): JsonResponse
    {
        CourseController::authorizeCourse($request->user(), $course);
        $data = $request->validate(['title' => ['required', 'string', 'max:255']]);

        $section = $course->sections()->create([
            'title' => $data['title'],
            'sort_order' => (int) $course->sections()->max('sort_order') + 1,
        ]);

        return response()->json(['data' => AdminCourseResource::section($section)], 201);
    }

    public function updateSection(Request $request, Section $section): JsonResponse
    {
        CourseController::authorizeCourse($request->user(), $section->loadMissing('course')->course);
        $section->update($request->validate(['title' => ['required', 'string', 'max:255']]));

        return response()->json(['data' => AdminCourseResource::section($section->load('lessons.attachments'))]);
    }

    public function destroySection(Request $request, Section $section): JsonResponse
    {
        $course = $section->loadMissing('course')->course;
        CourseController::authorizeCourse($request->user(), $course);

        DB::transaction(function () use ($section) {
            $section->lessons()->get()->each->delete();
            $section->delete();
        });
        $course->refreshCurriculumStats();
        $this->audit('course.section_deleted', $course, ['section' => $section->title]);

        return response()->json(['message' => __('admin.deleted')]);
    }

    public function reorderSections(Request $request, Course $course): JsonResponse
    {
        CourseController::authorizeCourse($request->user(), $course);
        $ids = $this->orderedIds($request, $course->sections()->pluck('id')->all());

        DB::transaction(function () use ($ids) {
            foreach ($ids as $i => $id) {
                Section::query()->whereKey($id)->update(['sort_order' => $i]);
            }
        });

        return response()->json(['message' => __('admin.reordered')]);
    }

    // ---- Lessons -------------------------------------------------------

    public function storeLesson(Request $request, Section $section): JsonResponse
    {
        CourseController::authorizeCourse($request->user(), $section->loadMissing('course')->course);
        $data = $this->lessonData($request);

        $lesson = Lesson::query()->create($data + [
            'course_id' => $section->course_id,
            'section_id' => $section->id,
            'sort_order' => (int) $section->lessons()->max('sort_order') + 1,
        ])->refresh();

        return response()->json(['data' => AdminCourseResource::lesson($lesson->load('attachments'))], 201);
    }

    public function updateLesson(Request $request, Lesson $lesson): JsonResponse
    {
        CourseController::authorizeCourse($request->user(), $lesson->loadMissing('course')->course);
        $data = $this->lessonData($request, true);

        // Moving between sections stays within the same course.
        if (isset($data['section_id'])) {
            abort_unless(Section::query()->whereKey($data['section_id'])->where('course_id', $lesson->course_id)->exists(), 422);
        }

        $lesson->update($data);
        $this->audit('course.lesson_updated', $lesson->loadMissing('course')->course, ['lesson_id' => $lesson->id, 'fields' => array_keys($data)]);

        return response()->json(['data' => AdminCourseResource::lesson($lesson->load('attachments'))]);
    }

    public function destroyLesson(Request $request, Lesson $lesson): JsonResponse
    {
        CourseController::authorizeCourse($request->user(), $lesson->loadMissing('course')->course);

        foreach ($lesson->loadMissing('attachments')->attachments as $attachment) {
            Storage::disk($attachment->disk)->delete($attachment->path);
        }
        $lesson->delete();
        $this->audit('course.lesson_deleted', $lesson->loadMissing('course')->course, ['lesson' => $lesson->title]);

        return response()->json(['message' => __('admin.deleted')]);
    }

    public function reorderLessons(Request $request, Section $section): JsonResponse
    {
        CourseController::authorizeCourse($request->user(), $section->loadMissing('course')->course);
        $ids = $this->orderedIds($request, $section->lessons()->pluck('id')->all());

        DB::transaction(function () use ($ids) {
            foreach ($ids as $i => $id) {
                Lesson::query()->whereKey($id)->update(['sort_order' => $i]);
            }
        });

        return response()->json(['message' => __('admin.reordered')]);
    }

    // ---- Attachments ---------------------------------------------------

    public function storeAttachment(Request $request, Lesson $lesson): JsonResponse
    {
        CourseController::authorizeCourse($request->user(), $lesson->loadMissing('course')->course);
        $data = $request->validate([
            'file' => ['required', 'file', 'max:51200', 'mimes:pdf,zip,docx,pptx,xlsx,png,jpg,jpeg,webp,txt'],
            'title' => ['nullable', 'string', 'max:255'],
        ]);

        $file = $request->file('file');
        $extension = strtolower($file->getClientOriginalExtension() ?: $file->extension());
        // Private disk: files are only streamed through the authorized endpoint.
        $path = $file->storeAs("attachments/{$lesson->course_id}", Str::random(40).".{$extension}", 'local');

        $attachment = $lesson->attachments()->create([
            'title' => $data['title'] ?? pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME),
            'disk' => 'local',
            'path' => $path,
            'mime_type' => $file->getMimeType(),
            'size_bytes' => $file->getSize(),
            'sort_order' => (int) $lesson->attachments()->max('sort_order') + 1,
        ]);
        $this->audit('course.attachment_uploaded', $lesson->loadMissing('course')->course, ['attachment_id' => $attachment->id]);

        return response()->json(['data' => ['id' => $attachment->id, 'title' => $attachment->title, 'size_bytes' => $attachment->size_bytes, 'mime_type' => $attachment->mime_type]], 201);
    }

    public function destroyAttachment(Request $request, Attachment $attachment): JsonResponse
    {
        CourseController::authorizeCourse($request->user(), $attachment->loadMissing('lesson.course')->lesson?->course);

        Storage::disk($attachment->disk)->delete($attachment->path);
        $attachment->delete();

        return response()->json(['message' => __('admin.deleted')]);
    }

    // ---- Helpers -------------------------------------------------------

    /** @return array<string, mixed> */
    private function planData(Request $request, bool $partial = false): array
    {
        $data = $request->validate([
            'name' => [$partial ? 'sometimes' : 'required', 'string', 'max:120'],
            'duration_days' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:3650'],
            'price' => [$partial ? 'sometimes' : 'required', 'numeric', 'min:0', 'max:100000'],
            'compare_at_price' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100000', 'gt:price'],
            'is_active' => ['sometimes', 'boolean'],
            'is_default' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:1000'],
        ]);

        return $this->applyMoney($data, ['price' => 'price_amount', 'compare_at_price' => 'compare_at_amount']);
    }

    /** @return array<string, mixed> */
    private function lessonData(Request $request, bool $partial = false): array
    {
        return $request->validate([
            'title' => [$partial ? 'sometimes' : 'required', 'string', 'max:255'],
            'type' => [$partial ? 'sometimes' : 'required', Rule::enum(LessonType::class)],
            'section_id' => ['sometimes', 'integer'],
            'content' => ['sometimes', 'nullable', 'string', 'max:100000'],
            'video_provider' => ['sometimes', 'nullable', Rule::in(['youtube', 'vimeo', 'bunny'])],
            'video_ref' => ['sometimes', 'nullable', 'string', 'max:255', 'regex:/^[A-Za-z0-9_\-]+$/'],
            'duration_seconds' => ['sometimes', 'integer', 'min:0', 'max:86400'],
            'is_preview' => ['sometimes', 'boolean'],
            'is_published' => ['sometimes', 'boolean'],
        ]);
    }

    /**
     * @param  list<int>  $allowed
     * @return list<int>
     */
    private function orderedIds(Request $request, array $allowed): array
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'size:'.count($allowed)],
            'ids.*' => ['integer', 'distinct', Rule::in($allowed)],
        ]);

        return array_map('intval', $data['ids']);
    }

    /** Only one default plan per course. */
    private function singleDefault(CoursePlan $plan): void
    {
        if ($plan->is_default) {
            CoursePlan::query()->where('course_id', $plan->course_id)->whereKeyNot($plan->id)->update(['is_default' => false]);
        }
    }
}
