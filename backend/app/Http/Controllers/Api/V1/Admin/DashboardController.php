<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\EnrollmentStatus;
use App\Enums\OrderStatus;
use App\Enums\ReviewStatus;
use App\Enums\RoleName;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Models\Enrollment;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Review;
use App\Models\User;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class DashboardController extends Controller
{
    /** Headline KPIs for the admin dashboard. */
    public function __invoke(): JsonResponse
    {
        Gate::authorize('viewAny', User::class);

        $currency = config('platform.commerce.currency', 'SAR');
        $since = now()->subDays(30);

        $byRole = collect(RoleName::cases())->mapWithKeys(fn (RoleName $role) => [
            $role->value => User::query()->withRole($role)->count(),
        ]);

        $paid = Order::query()->where('status', OrderStatus::Paid);

        // Revenue per day for the last 30 days (Riyadh calendar days).
        $tz = config('app.timezone', 'UTC') === 'UTC' ? 'Asia/Riyadh' : config('app.timezone');
        // Grouped in PHP so it works on any database without timezone tables.
        $daily = Order::query()
            ->where('status', OrderStatus::Paid)
            ->where('paid_at', '>=', $since->copy()->startOfDay())
            ->toBase()
            ->get(['paid_at', 'total_amount'])
            ->groupBy(fn ($row) => Carbon::parse($row->paid_at, 'UTC')->setTimezone($tz)->format('Y-m-d'));

        $series = collect(range(29, 0))->map(function (int $ago) use ($daily, $tz) {
            $day = now($tz)->subDays($ago)->format('Y-m-d');
            $rows = $daily->get($day, collect());

            return [
                'date' => $day,
                'revenue' => Money::toMajor((int) $rows->sum('total_amount')),
                'orders' => $rows->count(),
            ];
        })->values();

        $topCourses = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.status', OrderStatus::Paid)
            ->whereNotNull('order_items.course_id')
            ->groupBy('order_items.course_id', 'order_items.title')
            ->orderByDesc(DB::raw('count(*)'))
            ->limit(5)
            ->get([
                'order_items.course_id',
                'order_items.title',
                DB::raw('count(*) as sales'),
                DB::raw('sum(order_items.total_amount) as revenue'),
            ])
            ->map(fn ($row) => [
                'course_id' => (int) $row->course_id,
                'title' => $row->title,
                'sales' => (int) $row->sales,
                'revenue' => Money::toMajor((int) $row->revenue),
            ]);

        return response()->json([
            'data' => [
                'users' => [
                    'total' => User::query()->count(),
                    'active' => User::query()->where('status', UserStatus::Active)->count(),
                    'new_last_30_days' => User::query()->where('created_at', '>=', $since)->count(),
                    'by_role' => $byRole,
                ],
                'sales' => [
                    'currency' => $currency,
                    'revenue_total' => Money::toMajor((int) (clone $paid)->sum('total_amount')),
                    'revenue_last_30_days' => Money::toMajor((int) (clone $paid)->where('paid_at', '>=', $since)->sum('total_amount')),
                    'paid_orders_last_30_days' => (clone $paid)->where('paid_at', '>=', $since)->count(),
                    'pending_orders' => Order::query()->where('status', OrderStatus::Pending)->count(),
                    'daily' => $series,
                    'top_courses' => $topCourses,
                ],
                'learning' => [
                    'active_enrollments' => Enrollment::query()->where('status', EnrollmentStatus::Active)
                        ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))->count(),
                ],
                'attention' => [
                    'pending_reviews' => Review::query()->where('status', ReviewStatus::Pending)->count(),
                    'new_messages' => ContactMessage::query()->where('status', 'new')->count(),
                    'payments_needing_review' => Payment::query()
                        ->where(fn ($q) => $q->where('is_duplicate', true)->orWhere('failure_reason', 'amount_mismatch'))
                        ->count(),
                ],
            ],
        ]);
    }
}
