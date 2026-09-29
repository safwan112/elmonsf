<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Route-level role gate, e.g. `role:admin` or `role:admin,instructor`.
 * Fine-grained checks still happen in policies.
 */
class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            throw new AuthenticationException;
        }

        if (! $user->hasRole(...$roles)) {
            throw new AuthorizationException(__('api.forbidden'));
        }

        return $next($request);
    }
}
