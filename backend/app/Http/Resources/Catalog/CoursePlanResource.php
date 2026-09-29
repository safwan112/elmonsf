<?php

namespace App\Http\Resources\Catalog;

use App\Models\CoursePlan;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CoursePlan
 */
class CoursePlanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'duration_days' => $this->duration_days,
            'is_default' => $this->is_default,
            ...$this->priceArray(),
        ];
    }
}
