<?php

namespace App\Http\Resources\Content;

use App\Models\Page;
use App\Support\RichText;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Page
 */
class PageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'body_html' => RichText::toHtml($this->body),
            'seo' => [
                'title' => $this->seo_title ?: $this->title,
                'description' => $this->seo_description ?: RichText::excerpt($this->body),
            ],
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
