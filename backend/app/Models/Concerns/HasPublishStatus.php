<?php

namespace App\Models\Concerns;

use App\Enums\PublishStatus;
use Illuminate\Database\Eloquent\Builder;

/**
 * Content that is only visible publicly once published (and, when the model
 * has `published_at`, once that moment has passed — enables scheduling).
 *
 * @method static Builder published()
 */
trait HasPublishStatus
{
    public function scopePublished(Builder $query): Builder
    {
        $query->where($this->qualifyColumn('status'), PublishStatus::Published);

        if ($this->usesPublishedAt()) {
            $query->whereNotNull($this->qualifyColumn('published_at'))
                ->where($this->qualifyColumn('published_at'), '<=', now());
        }

        return $query;
    }

    public function isPublished(): bool
    {
        return $this->status === PublishStatus::Published
            && (! $this->usesPublishedAt() || ($this->published_at !== null && $this->published_at->isPast()));
    }

    protected function usesPublishedAt(): bool
    {
        return true;
    }
}
