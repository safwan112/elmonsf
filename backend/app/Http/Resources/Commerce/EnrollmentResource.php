<?php

namespace App\Http\Resources\Commerce;

use App\Http\Resources\Catalog\CourseListResource;
use App\Models\Enrollment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Enrollment
 */
class EnrollmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $current = $this->isCurrent();

        return [
            'id' => $this->id,
            'status' => ['value' => $current ? 'active' : ($this->status->value === 'active' ? 'expired' : $this->status->value), 'label' => $current ? 'فعّال' : ($this->status->value === 'revoked' ? 'ملغى' : 'منتهي')],
            'is_active' => $current,
            'source' => $this->source,
            'starts_at' => $this->starts_at->toIso8601String(),
            'expires_at' => $this->expires_at?->toIso8601String(),
            'days_left' => $current && $this->expires_at ? (int) max(0, ceil(now()->diffInHours($this->expires_at) / 24)) : null,
            'course' => new CourseListResource($this->whenLoaded('course')),
        ];
    }
}
