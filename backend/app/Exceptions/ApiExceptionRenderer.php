<?php

namespace App\Exceptions;

use App\Http\Middleware\SetLocale;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

/**
 * Renders every API error with the same envelope:
 *
 *   { "message": string, "code": string, "errors"?: {field: [..]} }
 */
class ApiExceptionRenderer
{
    public function __invoke(Throwable $e, Request $request): ?JsonResponse
    {
        if (! $request->is('api/*') && ! $request->expectsJson()) {
            return null;
        }

        if ($request->route() === null) {
            SetLocale::apply($request);
        }

        $response = match (true) {
            $e instanceof ValidationException => $this->respond(
                __('api.validation_failed'),
                'validation_failed',
                422,
                ['errors' => $e->errors()],
            ),
            $e instanceof AuthenticationException => $this->respond(__('api.unauthenticated'), 'unauthenticated', 401),
            $e instanceof AuthorizationException,
            $e instanceof AccessDeniedHttpException => $this->respond(
                $this->messageOr($e, __('api.forbidden')),
                'forbidden',
                403,
            ),
            $e instanceof ModelNotFoundException,
            $e instanceof NotFoundHttpException => $this->respond(__('api.not_found'), 'not_found', 404),
            $e instanceof MethodNotAllowedHttpException => $this->respond(__('api.method_not_allowed'), 'method_not_allowed', 405),
            $e instanceof TokenMismatchException => $this->respond(__('api.csrf_mismatch'), 'csrf_token_mismatch', 419),
            $e instanceof ThrottleRequestsException => $this->respond(
                __('api.too_many_requests'),
                'too_many_requests',
                429,
                headers: $e->getHeaders(),
            ),
            $e instanceof DomainException => $this->respond($e->getMessage(), $e->errorCode, $e->status),
            $e instanceof HttpExceptionInterface => $this->respond(
                $this->messageOr($e, __('api.server_error')),
                'http_error',
                $e->getStatusCode(),
                headers: $e->getHeaders(),
            ),
            default => $this->respond(
                config('app.debug') ? $e->getMessage() : __('api.server_error'),
                'server_error',
                500,
            ),
        };

        $response->headers->set('Content-Language', app()->getLocale());

        return $response;
    }

    private function messageOr(Throwable $e, string $fallback): string
    {
        $message = $e->getMessage();

        // Framework default English messages are replaced by localized ones.
        return ($message === '' || $message === 'This action is unauthorized.') ? $fallback : $message;
    }

    /**
     * @param  array<string, mixed>  $extra
     * @param  array<string, string>  $headers
     */
    private function respond(string $message, string $code, int $status, array $extra = [], array $headers = []): JsonResponse
    {
        return new JsonResponse(
            ['message' => $message, 'code' => $code] + $extra,
            $status,
            $headers,
            JSON_UNESCAPED_UNICODE,
        );
    }
}
