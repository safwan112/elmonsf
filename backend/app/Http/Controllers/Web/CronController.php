<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

/**
 * Runs the scheduled maintenance commands over HTTP, for hosts without a
 * long-running cron (Vercel Cron). Servers with cron use `schedule:run`.
 */
class CronController extends Controller
{
    private const COMMANDS = [
        'model:prune',
        'auth:clear-resets',
        'enrollments:expire',
        'enrollments:remind-expiring',
        'exams:close-expired',
        'orders:cancel-stale',
    ];

    public function __invoke(Request $request): JsonResponse
    {
        $secret = (string) config('platform.cron_secret');
        abort_if($secret === '' || ! hash_equals("Bearer {$secret}", (string) $request->header('Authorization')), 404);

        $results = [];
        foreach (self::COMMANDS as $command) {
            $results[$command] = Artisan::call($command);
        }

        return response()->json(['ran' => $results]);
    }
}
