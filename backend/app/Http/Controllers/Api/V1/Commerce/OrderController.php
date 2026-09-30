<?php

namespace App\Http\Controllers\Api\V1\Commerce;

use App\Enums\OrderStatus;
use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Resources\Commerce\EnrollmentResource;
use App\Http\Resources\Commerce\InvoiceResource;
use App\Http\Resources\Commerce\OrderResource;
use App\Models\Enrollment;
use App\Models\Invoice;
use App\Models\Order;
use App\Services\AuditLogger;
use App\Services\Learning\CourseProgress;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class OrderController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $orders = $request->user()->orders()
            ->withCount('items')
            ->with('invoice')
            ->latest('id')
            ->paginate(min(50, max(1, $request->integer('per_page', 10))));

        return OrderResource::collection($orders);
    }

    public function show(Order $order): OrderResource
    {
        Gate::authorize('view', $order);

        return new OrderResource($order->load(['items.course', 'items.product', 'payments', 'invoice']));
    }

    public function cancel(Request $request, Order $order, AuditLogger $audit): OrderResource
    {
        Gate::authorize('cancel', $order);

        DB::transaction(function () use ($order, $request, $audit) {
            $locked = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            if (! $locked->status->isPayable()) {
                throw new DomainException(__('commerce.order_not_cancellable'), 'order_not_cancellable', 409);
            }
            $locked->forceFill(['status' => OrderStatus::Cancelled, 'cancelled_at' => now()])->save();
            $audit->log('order.cancelled', $locked, [], $request->user());
        });

        return (new OrderResource($order->refresh()->load(['items', 'payments', 'invoice'])))
            ->additional(['message' => __('commerce.order_cancelled')]);
    }

    public function invoices(Request $request): AnonymousResourceCollection
    {
        return InvoiceResource::collection(
            Invoice::query()->where('user_id', $request->user()->id)->with('order')->latest('id')->paginate(20)
        );
    }

    public function invoice(Invoice $invoice): InvoiceResource
    {
        Gate::authorize('view', $invoice);

        return new InvoiceResource($invoice->load('order'));
    }

    public function enrollments(Request $request): AnonymousResourceCollection
    {
        $enrollments = $request->user()->enrollments()
            ->with(['course' => fn ($q) => $q->withTrashed()->with(['category', 'instructor'])])
            ->orderByRaw("CASE WHEN status = 'active' AND (expires_at IS NULL OR expires_at > ?) THEN 0 ELSE 1 END", [now()])
            ->latest('updated_at')
            ->get();

        $progress = app(CourseProgress::class)->forCourses($request->user(), $enrollments->pluck('course_id')->map(fn ($id) => (int) $id)->all());
        $enrollments->each(fn (Enrollment $e) => $e->setAttribute('progress', $progress[$e->course_id] ?? null));

        return EnrollmentResource::collection($enrollments);
    }
}
