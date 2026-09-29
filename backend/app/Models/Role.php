<?php

namespace App\Models;

use App\Enums\RoleName;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Role extends Model
{
    protected $fillable = ['name', 'display_name'];

    protected function casts(): array
    {
        return [
            'name' => RoleName::class,
        ];
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withPivot('created_at');
    }

    /**
     * Idempotently create the built-in roles.
     */
    public static function ensureDefaults(): void
    {
        foreach (RoleName::cases() as $role) {
            static::query()->firstOrCreate(
                ['name' => $role->value],
                ['display_name' => $role->label()],
            );
        }
    }

    public static function findByName(RoleName|string $name): self
    {
        $value = $name instanceof RoleName ? $name->value : $name;

        return static::query()->where('name', $value)->firstOrFail();
    }
}
