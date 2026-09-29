<?php

namespace App\Http\Resources\Commerce;

use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Order
 */
class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'number' => $this->number,
            'status' => ['value' => $this->status->value, 'label' => $this->status->label()],
            'is_payable' => $this->status->isPayable() && $this->total_amount > 0,
            'currency' => $this->currency,
            'subtotal' => $this->money($this->subtotal_amount),
            'discount' => $this->money($this->discount_amount),
            'tax' => $this->money($this->tax_amount),
            'total' => $this->money($this->total_amount),
            'coupon_code' => $this->coupon_code,
            'billing' => [
                'name' => $this->billing_name,
                'email' => $this->billing_email,
                'phone' => $this->billing_phone,
            ],
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn (OrderItem $item) => [
                'id' => $item->id,
                'type' => $item->purchasable_type->value,
                'title' => $item->title,
                'plan_name' => $item->plan_name,
                'duration_days' => $item->duration_days,
                'course_slug' => $item->relationLoaded('course') ? $item->course?->slug : null,
                'product_slug' => $item->relationLoaded('product') ? $item->product?->slug : null,
                'unit_price' => $this->money($item->unit_amount),
                'discount' => $this->money($item->discount_amount),
                'total' => $this->money($item->total_amount),
            ])->values()),
            'items_count' => $this->whenCounted('items'),
            'payments' => $this->whenLoaded('payments', fn () => $this->payments->map(fn (Payment $p) => [
                'id' => $p->id,
                'provider' => $p->provider,
                'status' => ['value' => $p->status->value, 'label' => $p->status->label()],
                'amount' => $this->money($p->amount),
                'paid_at' => $p->paid_at?->toIso8601String(),
                'created_at' => $p->created_at?->toIso8601String(),
                // Admin-only diagnostics.
                ...($request->user()?->isAdmin() ? [
                    'provider_invoice_id' => $p->provider_invoice_id,
                    'provider_payment_id' => $p->provider_payment_id,
                    'failure_reason' => $p->failure_reason,
                    'is_duplicate' => $p->is_duplicate,
                ] : []),
            ])->values()),
            'has_pending_payment' => $this->whenLoaded('payments', fn () => $this->payments->contains(fn (Payment $p) => $p->status === PaymentStatus::Pending)),
            'invoice_number' => $this->whenLoaded('invoice', fn () => $this->invoice?->number),
            'user' => $this->when($request->user()?->isAdmin() && $this->relationLoaded('user'), fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
            ]),
            'failure_reason' => $this->failure_reason,
            'paid_at' => $this->paid_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
            'refunded_at' => $this->refunded_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
