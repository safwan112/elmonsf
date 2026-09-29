<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Arabic is the default; clients may request English via Accept-Language.
 */
class SetLocale
{
    public const SUPPORTED = ['ar', 'en'];

    public function handle(Request $request, Closure $next): Response
    {
        $locale = self::apply($request);

        $response = $next($request);
        $response->headers->set('Content-Language', $locale);

        return $response;
    }

    /**
     * Resolve and apply the request locale. Also used by the exception
     * renderer for requests that never reached the middleware (e.g. 404s).
     */
    public static function apply(Request $request): string
    {
        $locale = $request->headers->has('Accept-Language')
            ? $request->getPreferredLanguage(self::SUPPORTED)
            : config('app.locale');

        app()->setLocale($locale);

        return $locale;
    }
}
