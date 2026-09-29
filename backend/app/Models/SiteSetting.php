<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class SiteSetting extends Model
{
    public const CACHE_KEY = 'site_settings.public';

    protected $fillable = ['key', 'value', 'is_public'];

    protected function casts(): array
    {
        return [
            'value' => 'array',
            'is_public' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget(self::CACHE_KEY));
        static::deleted(fn () => Cache::forget(self::CACHE_KEY));
    }

    /**
     * @return array<string, mixed>
     */
    public static function publicValues(): array
    {
        return Cache::remember(self::CACHE_KEY, now()->addHour(), fn () => static::query()
            ->where('is_public', true)
            ->pluck('value', 'key')
            ->all());
    }

    public static function set(string $key, mixed $value, bool $public = false): self
    {
        return static::query()->updateOrCreate(['key' => $key], ['value' => $value, 'is_public' => $public]);
    }
}
