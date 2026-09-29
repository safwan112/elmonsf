<?php

namespace App\Services\Commerce;

use App\Models\Invoice;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\SiteSetting;

class InvoiceService
{
    public function __construct(private readonly DocumentNumber $numbers) {}

    /**
     * Issue the (simplified tax) invoice for a paid order. Idempotent: an
     * order has at most one invoice. Call inside a transaction.
     */
    public function issue(Order $order): Invoice
    {
        if ($existing = $order->invoice()->first()) {
            return $existing;
        }

        $settings = SiteSetting::query()->pluck('value', 'key');

        return Invoice::query()->create([
            'number' => $this->numbers->next('invoice', 'INV'),
            'order_id' => $order->id,
            'user_id' => $order->user_id,
            'currency' => $order->currency,
            'subtotal_amount' => $order->subtotal_amount,
            'discount_amount' => $order->discount_amount,
            'tax_amount' => $order->tax_amount,
            'total_amount' => $order->total_amount,
            'vat_rate' => (int) config('platform.commerce.vat_rate'),
            'seller' => [
                'name' => $settings['legal_name'] ?? $settings['site_name'] ?? config('app.name'),
                'vat_number' => $settings['vat_number'] ?? null,
                'address' => $settings['address'] ?? null,
                'email' => $settings['contact_email'] ?? null,
            ],
            'buyer' => [
                'name' => $order->billing_name,
                'email' => $order->billing_email,
                'phone' => $order->billing_phone,
            ],
            'lines' => $order->items->map(fn (OrderItem $item) => [
                'title' => $item->title,
                'plan_name' => $item->plan_name,
                'unit_amount' => $item->unit_amount,
                'discount_amount' => $item->discount_amount,
                'total_amount' => $item->total_amount,
            ])->values()->all(),
            'issued_at' => now(),
        ]);
    }
}
