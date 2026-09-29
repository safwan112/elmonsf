<?php

namespace App\Http\Controllers\Api\V1\Admin\Concerns;

use App\Services\AuditLogger;
use App\Services\MediaService;
use App\Support\Money;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Small helpers shared by the admin CRUD controllers.
 */
trait AdminCrud
{
    protected function perPage(Request $request, int $default = 20): int
    {
        return max(1, min(100, $request->integer('per_page', $default)));
    }

    /**
     * Standard paginated envelope ({data, links, meta}) with each item
     * mapped by `$present`.
     *
     * @param  LengthAwarePaginator<int, mixed>  $page
     */
    protected function paginated(LengthAwarePaginator $page, callable $present): JsonResponse
    {
        return JsonResource::collection($page->through($present))->response();
    }

    /** Escape LIKE wildcards in user input. */
    protected function like(string $term): string
    {
        return '%'.addcslashes(trim($term), '%_\\').'%';
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    protected function audit(string $action, ?Model $subject = null, array $metadata = []): void
    {
        app(AuditLogger::class)->log($action, $subject, $metadata);
    }

    /**
     * Replace `{field}_media_id` inputs with the stored path in `$column`.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function applyMedia(array $data, string $input, string $column): array
    {
        if (array_key_exists($input, $data)) {
            $data[$column] = app(MediaService::class)->pathFor($data[$input] !== null ? (int) $data[$input] : null);
            unset($data[$input]);
        }

        return $data;
    }

    /**
     * Convert money inputs in SAR (e.g. 199.5) to halalas.
     *
     * @param  array<string, mixed>  $data
     * @param  array<string, string>  $map  input => column
     * @return array<string, mixed>
     */
    protected function applyMoney(array $data, array $map): array
    {
        foreach ($map as $input => $column) {
            if (array_key_exists($input, $data)) {
                $data[$column] = $data[$input] === null ? null : Money::toMinor($data[$input]);
                if ($input !== $column) {
                    unset($data[$input]);
                }
            }
        }

        return $data;
    }
}
