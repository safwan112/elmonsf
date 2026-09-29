<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        try {
            DB::select('select 1');
            $database = 'ok';
        } catch (Throwable $e) {
            report($e);
            $database = 'unavailable';
        }

        $healthy = $database === 'ok';

        return response()->json([
            'data' => [
                'status' => $healthy ? 'ok' : 'degraded',
                'database' => $database,
                'time' => now()->toIso8601String(),
            ],
        ], $healthy ? 200 : 503);
    }
}
