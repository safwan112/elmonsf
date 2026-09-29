<?php

namespace App\Http\Controllers\Api\V1\Learning\Concerns;

use App\Exceptions\DomainException;
use Illuminate\Support\Facades\Gate;

trait GuardsLearningAccess
{
    /**
     * Policy check that answers 403 `content_locked`, so the SPA can offer
     * the purchase path instead of a generic "forbidden".
     */
    protected function ensureAllowed(string $ability, mixed $model): void
    {
        if (Gate::denies($ability, $model)) {
            throw new DomainException(__('learning.locked'), 'content_locked', 403);
        }
    }
}
