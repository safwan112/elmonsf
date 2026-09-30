<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Commerce\OrderResource;
use App\Models\Order;
use App\Services\Payments\RefundService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::enum(OrderStatus::class)],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $orders = Order::query()
            ->with(['user', 'invoice'])
            ->withCount('items')
            ->when($data['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->when($data['search'] ?? null, function ($q, $term) {
                $like = '%'.addcslashes($term, '%_\\').'%';
                $q->where(fn ($w) => $w->whereLike('number', $like)->orWhereLike('billing_email', $like)->orWhereLike('billing_name', $like));
            })
            ->latest('id')
            ->paginate($data['per_page'] ?? 20)
            ->withQueryString();

        return OrderResource::collection($orders);
    }

    public function show(Order $order): OrderResource
    {
        return new OrderResource($order->load(['user', 'items.course', 'items.product', 'payments', 'invoice']));
    }

    public function refund(Request $request, Order $order, RefundService $refunds): OrderResource
    {
        Gate::authorize('refund', $order);
        $data = $request->validate(['reason' => ['required', 'string', 'min:3', 'max:500']]);

        $refunds->recordManualRefund($order, $request->user(), $data['reason']);

        return (new OrderResource($order->refresh()->load(['user', 'items', 'payments', 'invoice'])))
            ->additional(['message' => __('commerce.refunded')]);
    }
}
