<?php

namespace App\Models\Concerns;

use App\Support\ArabicText;
use Illuminate\Database\Eloquent\Builder;

/**
 * Keeps a normalised `search_text` column in sync and provides an
 * Arabic-aware `search()` scope (every term must match). PostgreSQL ranks
 * by trigram similarity (GIN pg_trgm index); MySQL/MariaDB ranks by how
 * early the first term appears (fragments are indexed most important first).
 *
 * @method static Builder search(?string $query)
 */
trait Searchable
{
    /**
     * Text fragments to index, most important first.
     *
     * @return list<string|null>
     */
    abstract protected function searchableFragments(): array;

    public static function bootSearchable(): void
    {
        static::saving(function (self $model) {
            $model->search_text = ArabicText::normalize(implode(' ', array_filter($model->searchableFragments())));
        });
    }

    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        $terms = ArabicText::terms($term);
        if ($terms === []) {
            return $query;
        }

        $column = $query->getModel()->qualifyColumn('search_text');

        foreach ($terms as $t) {
            $query->where($column, 'like', '%'.addcslashes($t, '%_\\').'%');
        }

        if ($query->getConnection()->getDriverName() === 'pgsql') {
            return $query->orderByRaw("similarity({$column}, ?) DESC", [implode(' ', $terms)]);
        }

        return $query->orderByRaw("LOCATE(?, {$column}) ASC", [$terms[0]]);
    }
}
