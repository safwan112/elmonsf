<?php

namespace App\Http\Controllers\Api\V1\Commerce;

use App\Http\Controllers\Controller;
use App\Http\Resources\Commerce\OrderResource;
use App\Services\Commerce\CheckoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CheckoutController extends Controller
{
    public function __construct(private readonly CheckoutService $checkout) {}

    public function store(Request $request): JsonResponse
    {
        $request->merge([
            'billing_name' => ($name = trim(strip_tags((string) $request->input('billing_name')))) === '' ? null : $name,
            'billing_phone' => ($phone = preg_replace('/[\s\-()]/', '', (string) $request->input('billing_phone'))) === '' ? null : $phone,
        ]);
        $data = $request->validate([
            'billing_name' => ['nullable', 'string', 'min:2', 'max:100'],
            'billing_phone' => ['nullable', 'string', 'regex:/^\+?[0-9]{8,15}$/'],
            'accept_terms' => ['accepted'],
        ]);

        $order = $this->checkout->placeOrder($request->user(), $data, $request->ip());

        return (new OrderResource($order->load(['items.course', 'items.product', 'payments', 'invoice'])))
            ->additional(['message' => __('commerce.order_created')])
            ->response()
            ->setStatusCode(201);
    }
}
