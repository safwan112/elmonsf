<?php

namespace App\Http\Resources\Catalog;

use App\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Compact course representation for cards and lists.
 *
 * @mixin Course
 */
class CourseListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'cover_url' => $this->coverUrl(),
            'level' => ['value' => $this->level->value, 'label' => $this->level->label()],
            'is_featured' => $this->is_featured,
            'lessons_count' => $this->lessons_count,
            'duration_seconds' => $this->duration_seconds,
            'students_count' => $this->students_count,
            'rating' => ['average' => $this->rating_avg, 'count' => $this->rating_count],
            'category' => $this->whenLoaded('category', fn () => [
                'id' => $this->category->id,
                'name' => $this->category->name,
                'slug' => $this->category->slug,
            ]),
            'instructor' => $this->whenLoaded('instructor', fn () => $this->instructor ? [
                'name' => $this->instructor->name,
                'slug' => $this->instructor->slug,
                'avatar_url' => $this->instructor->avatarUrl(),
            ] : null),
            'starting_plan' => $this->whenLoaded('cheapestPlan', fn () => $this->cheapestPlan
                ? new CoursePlanResource($this->cheapestPlan)
                : null),
            'published_at' => $this->published_at?->toIso8601String(),
        ];
    }
}
