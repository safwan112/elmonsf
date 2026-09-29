<?php

namespace App\Http\Resources\Catalog;

use App\Models\Course;
use App\Models\Lesson;
use App\Models\Section;
use App\Support\RichText;
use Illuminate\Http\Request;

/**
 * Full public course page. Never includes paid lesson content.
 *
 * @mixin Course
 */
class CourseResource extends CourseListResource
{
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'description_html' => RichText::toHtml($this->description),
            'language' => $this->language,
            'outcomes' => $this->outcomes ?? [],
            'requirements' => $this->requirements ?? [],
            'instructor' => $this->whenLoaded('instructor', fn () => $this->instructor
                ? (new InstructorResource($this->instructor))->detailed()
                : null),
            'plans' => CoursePlanResource::collection($this->whenLoaded('activePlans')),
            'curriculum' => $this->whenLoaded('sections', fn () => $this->sections->map(fn (Section $section) => [
                'id' => $section->id,
                'title' => $section->title,
                'lessons_count' => $section->lessons->count(),
                'duration_seconds' => $section->lessons->sum('duration_seconds'),
                'lessons' => $section->lessons->map(fn (Lesson $lesson) => [
                    'id' => $lesson->id,
                    'title' => $lesson->title,
                    'type' => ['value' => $lesson->type->value, 'label' => $lesson->type->label()],
                    'duration_seconds' => $lesson->duration_seconds,
                    'is_preview' => $lesson->is_preview,
                ])->values(),
            ])->values()),
            'tags' => $this->whenLoaded('tags', fn () => $this->tags->map(fn ($t) => ['name' => $t->name, 'slug' => $t->slug])),
            'seo' => [
                'title' => $this->seo_title ?: $this->title,
                'description' => $this->seo_description ?: ($this->subtitle ?: RichText::excerpt($this->description)),
            ],
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
