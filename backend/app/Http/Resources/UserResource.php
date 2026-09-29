<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'avatar_url' => $this->avatarUrl(),
            'locale' => $this->locale,
            'status' => $this->status->value,
            'roles' => $this->whenLoaded('roles', fn () => $this->roleNames()),
            'email_verified' => $this->email_verified_at !== null,
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            'last_login_at' => $this->when(
                $request->user()?->isAdmin() || $request->user()?->is($this->resource),
                fn () => $this->last_login_at?->toIso8601String(),
            ),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
