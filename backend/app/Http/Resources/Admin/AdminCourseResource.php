<?php

namespace App\Http\Resources\Admin;

use App\Models\Attachment;
use App\Models\Course;
use App\Models\CoursePlan;
use App\Models\Lesson;
use App\Models\Section;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A course as the admin editor needs it: every editable field, plans in
 * SAR and the full curriculum (including paid lesson content).
 *
 * @mixin Course
 */
class AdminCourseResource extends JsonResource
{
    private bool $detailed = false;

    public function detailed(): static
    {
        $this->detailed = true;

        return $this;
    }

    public function toArray(Request $request): array
    {
        $base = [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'status' => ['value' => $this->status->value, 'label' => $this->status->label()],
            'is_featured' => $this->is_featured,
            'cover_url' => $this->coverUrl(),
            'category' => $this->whenLoaded('category', fn () => $this->category ? ['id' => $this->category->id, 'name' => $this->category->name] : null),
            'instructor' => $this->whenLoaded('instructor', fn () => $this->instructor ? ['id' => $this->instructor->id, 'name' => $this->instructor->name] : null),
            'lessons_count' => $this->lessons_count,
            'students_count' => $this->students_count,
            'published_at' => $this->published_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];

        if (! $this->detailed) {
            return $base;
        }

        return [
            ...$base,
            'category_id' => $this->category_id,
            'instructor_id' => $this->instructor_id,
            'subtitle' => $this->subtitle,
            'description' => $this->description,
            'level' => $this->level->value,
            'language' => $this->language,
            'outcomes' => $this->outcomes ?? [],
            'requirements' => $this->requirements ?? [],
            'seo_title' => $this->seo_title,
            'seo_description' => $this->seo_description,
            'tags' => $this->whenLoaded('tags', fn () => $this->tags->pluck('name')->values()),
            'plans' => $this->whenLoaded('plans', fn () => $this->plans->map(fn (CoursePlan $p) => self::plan($p))->values()),
            'sections' => $this->whenLoaded('sections', fn () => $this->sections->map(fn (Section $s) => self::section($s))->values()),
        ];
    }

    /** @return array<string, mixed> */
    public static function plan(CoursePlan $p): array
    {
        return [
            'id' => $p->id,
            'name' => $p->name,
            'duration_days' => $p->duration_days,
            'price' => Money::toMajor($p->price_amount),
            'compare_at_price' => Money::toMajor($p->compare_at_amount),
            'currency' => $p->currency,
            'is_active' => $p->is_active,
            'is_default' => $p->is_default,
            'sort_order' => $p->sort_order,
        ];
    }

    /** @return array<string, mixed> */
    public static function section(Section $s): array
    {
        return [
            'id' => $s->id,
            'title' => $s->title,
            'sort_order' => $s->sort_order,
            'lessons' => $s->relationLoaded('lessons') ? $s->lessons->map(fn (Lesson $l) => self::lesson($l))->values() : [],
        ];
    }

    /** @return array<string, mixed> */
    public static function lesson(Lesson $l): array
    {
        return [
            'id' => $l->id,
            'section_id' => $l->section_id,
            'title' => $l->title,
            'type' => $l->type->value,
            'content' => $l->content,
            'video_provider' => $l->video_provider,
            'video_ref' => $l->video_ref,
            'duration_seconds' => $l->duration_seconds,
            'is_preview' => $l->is_preview,
            'is_published' => $l->is_published,
            'sort_order' => $l->sort_order,
            'attachments' => $l->relationLoaded('attachments')
                ? $l->attachments->map(fn (Attachment $a) => ['id' => $a->id, 'title' => $a->title, 'size_bytes' => $a->size_bytes, 'mime_type' => $a->mime_type])->values()
                : [],
        ];
    }
}
