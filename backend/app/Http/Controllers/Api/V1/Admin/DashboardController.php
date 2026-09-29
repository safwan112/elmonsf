<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\RoleName;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class DashboardController extends Controller
{
    /**
     * Headline KPIs for the admin dashboard. Commerce/learning metrics are
     * added as those modules land.
     */
    public function __invoke(): JsonResponse
    {
        Gate::authorize('viewAny', User::class);

        $byRole = collect(RoleName::cases())->mapWithKeys(fn (RoleName $role) => [
            $role->value => User::query()->withRole($role)->count(),
        ]);

        return response()->json([
            'data' => [
                'users' => [
                    'total' => User::query()->count(),
                    'active' => User::query()->where('status', UserStatus::Active)->count(),
                    'new_last_30_days' => User::query()->where('created_at', '>=', now()->subDays(30))->count(),
                    'by_role' => $byRole,
                ],
            ],
        ]);
    }
}
