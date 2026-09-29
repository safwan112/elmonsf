<?php

namespace App\Http\Middleware;

use App\Exceptions\DomainException;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gate for actions that require a confirmed email (e.g. checkout).
 * Returns the standard error envelope with code `email_unverified`.
 */
class EnsureEmailIsVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->hasVerifiedEmail()) {
            throw new DomainException(__('api.email_unverified'), 'email_unverified', 403);
        }

        return $next($request);
    }
}
