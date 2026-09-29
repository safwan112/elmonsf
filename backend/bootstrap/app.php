<?php

use App\Exceptions\ApiExceptionRenderer;
use App\Exceptions\DomainException;
use App\Http\Middleware\EnsureEmailIsVerified;
use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\ForceJsonResponse;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\SetLocale;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Cookie-based Sanctum authentication for the first-party SPA.
        $middleware->statefulApi();

        $middleware->append(SecurityHeaders::class);

        $middleware->api(prepend: [
            ForceJsonResponse::class,
            SetLocale::class,
        ]);

        $middleware->alias([
            'role' => EnsureUserHasRole::class,
            'active' => EnsureUserIsActive::class,
            'verified' => EnsureEmailIsVerified::class,
        ]);

        // Payment gateway webhooks are server-to-server and signed; they
        // cannot carry a CSRF token.
        $middleware->validateCsrfTokens(except: [
            'api/v1/payments/*/webhook',
        ]);

        // Trust only the configured reverse proxies (comma separated IPs/CIDRs,
        // or "*" behind a managed load balancer). Needed for correct client
        // IPs in rate limiting and audit logs.
        if ($proxies = env('TRUSTED_PROXIES')) {
            $middleware->trustProxies(at: $proxies === '*' ? '*' : array_map('trim', explode(',', $proxies)));
        }
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(new ApiExceptionRenderer);
        $exceptions->dontReport([
            DomainException::class,
        ]);
    })->create();
