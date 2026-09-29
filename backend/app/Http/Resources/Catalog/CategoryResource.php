<?php

namespace App\Http\Resources\Catalog;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Category
 */
class CategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'icon' => $this->icon,
            'parent_id' => $this->parent_id,
            'courses_count' => $this->whenCounted('courses'),
            'products_count' => $this->whenCounted('products'),
            'children' => self::collection($this->whenLoaded('children')),
            'parent' => $this->whenLoaded('parent', fn () => $this->parent ? new self($this->parent) : null),
            'seo' => [
                'title' => $this->seo_title ?: $this->name,
                'description' => $this->seo_description ?: $this->description,
            ],
        ];
    }
}
