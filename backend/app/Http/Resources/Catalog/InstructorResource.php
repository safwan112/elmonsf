<?php

namespace App\Http\Resources\Catalog;

use App\Models\Instructor;
use App\Support\RichText;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Instructor
 */
class InstructorResource extends JsonResource
{
    private bool $detailed = false;

    public function detailed(): static
    {
        $this->detailed = true;

        return $this;
    }

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'headline' => $this->headline,
            'avatar_url' => $this->avatarUrl(),
            'courses_count' => $this->whenCounted('courses'),
            'bio_html' => $this->when($this->detailed, fn () => RichText::toHtml($this->bio)),
            'bio_excerpt' => $this->when(! $this->detailed, fn () => RichText::excerpt($this->bio, 140)),
        ];
    }
}
