<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Model;

/**
 * A slug that is unique in a model's table: "title", "title-2", "title-3"…
 * Soft-deleted rows count too, since the database index covers them.
 */
final class UniqueSlug
{
    /**
     * @param  class-string<Model>  $model
     */
    public static function for(string $model, string $source, ?int $ignoreId = null, string $column = 'slug'): string
    {
        $base = Slug::make($source) ?: 'item';
        $slug = $base;
        $n = 2;

        while (self::taken($model, $column, $slug, $ignoreId)) {
            $slug = "{$base}-{$n}";
            $n++;
        }

        return $slug;
    }

    /**
     * @param  class-string<Model>  $model
     */
    private static function taken(string $model, string $column, string $slug, ?int $ignoreId): bool
    {
        $query = $model::query();
        if (method_exists($model, 'bootSoftDeletes')) {
            $query->withTrashed();
        }

        return $query->where($column, $slug)->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))->exists();
    }
}
