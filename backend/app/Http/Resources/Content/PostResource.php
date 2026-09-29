<?php

namespace App\Http\Resources\Content;

use App\Models\Post;
use App\Support\RichText;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Post
 */
class PostResource extends JsonResource
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
            'slug' => $this->slug,
            'title' => $this->title,
            'excerpt' => $this->excerpt ?: RichText::excerpt($this->body),
            'cover_url' => $this->coverUrl(),
            'reading_minutes' => $this->reading_minutes,
            'author' => $this->whenLoaded('author', fn () => $this->author ? ['name' => $this->author->name] : null),
            'tags' => $this->whenLoaded('tags', fn () => $this->tags->map(fn ($t) => ['name' => $t->name, 'slug' => $t->slug])),
            'body_html' => $this->when($this->detailed, fn () => RichText::toHtml($this->body)),
            'seo' => $this->when($this->detailed, fn () => [
                'title' => $this->seo_title ?: $this->title,
                'description' => $this->seo_description ?: ($this->excerpt ?: RichText::excerpt($this->body)),
            ]),
            'published_at' => $this->published_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
