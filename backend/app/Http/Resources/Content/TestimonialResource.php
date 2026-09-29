<?php

namespace App\Http\Resources\Content;

use App\Models\Testimonial;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Testimonial
 */
class TestimonialResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'subtitle' => $this->subtitle,
            'body' => $this->body,
            'rating' => $this->rating,
            'avatar_url' => $this->avatarUrl(),
        ];
    }
}
