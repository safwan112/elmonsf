<?php

namespace App\Http\Resources\Catalog;

use App\Models\Product;
use App\Support\RichText;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Product
 */
class ProductResource extends JsonResource
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
            'subtitle' => $this->subtitle,
            'type' => ['value' => $this->type->value, 'label' => $this->type->label()],
            'cover_url' => $this->coverUrl(),
            'is_featured' => $this->is_featured,
            ...$this->priceArray(),
            'category' => $this->whenLoaded('category', fn () => $this->category ? [
                'id' => $this->category->id,
                'name' => $this->category->name,
                'slug' => $this->category->slug,
            ] : null),
            'description_html' => $this->when($this->detailed, fn () => RichText::toHtml($this->description)),
            'seo' => $this->when($this->detailed, fn () => [
                'title' => $this->seo_title ?: $this->title,
                'description' => $this->seo_description ?: ($this->subtitle ?: RichText::excerpt($this->description)),
            ]),
            'published_at' => $this->published_at?->toIso8601String(),
        ];
    }
}
