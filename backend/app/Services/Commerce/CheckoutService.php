<?php

namespace App\Services\Commerce;

use App\Enums\OrderStatus;
use App\Exceptions\DomainException;
use App\Models\Cart;
use App\Models\Order;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\Payments\PaymentProcessor;
use Illuminate\Support\Facades\DB;

class CheckoutService
{
    public function __construct(
        private readonly CartService $carts,
        private readonly PricingService $pricing,
        private readonly DocumentNumber $numbers,
        private readonly PaymentProcessor $processor,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Turn the cart into a PENDING order, re-pricing everything from the
     * live catalog. Free orders (e.g. 100% coupon) are completed at once.
     *
     * @param  array{billing_name?: string|null, billing_phone?: string|null}  $billing
     */
    public function placeOrder(User $user, array $billing, ?string $ip = null): Order
    {
        $order = DB::transaction(function () use ($user, $billing, $ip) {
            /** @var Cart $cart */
            $cart = Cart::query()->where('user_id', $user->id)->lockForUpdate()->first();
            if (! $cart) {
                throw new DomainException(__('commerce.cart_empty'), 'cart_empty');
            }

            [$lines, $removed] = $this->carts->lines($cart, prune: true);
            if ($removed !== []) {
                throw new DomainException(__('commerce.cart_changed'), 'cart_changed', 409);
            }
            if ($lines === []) {
                throw new DomainException(__('commerce.cart_empty'), 'cart_empty');
            }

            $summary = $this->pricing->summarize($lines, $cart->coupon, $user);

            $order = Order::query()->create([
                'number' => $this->numbers->next('order', 'ORD'),
                'user_id' => $user->id,
                'status' => OrderStatus::Pending,
                'currency' => $summary->currency,
                'subtotal_amount' => $summary->subtotal,
                'discount_amount' => $summary->discount,
                'tax_amount' => $summary->tax,
                'total_amount' => $summary->total,
                'coupon_id' => $summary->coupon?->id,
                'coupon_code' => $summary->coupon?->code,
                'billing_name' => ($billing['billing_name'] ?? null) ?: $user->name,
                'billing_email' => $user->email,
                'billing_phone' => ($billing['billing_phone'] ?? null) ?: $user->phone,
                'ip_address' => $ip,
            ]);

            foreach ($summary->lines as $line) {
                $order->items()->create([
                    'purchasable_type' => $line->type,
                    'purchasable_id' => $line->purchasableId,
                    'course_id' => $line->courseId,
                    'product_id' => $line->productId,
                    'title' => $line->title,
                    'plan_name' => $line->planName,
                    'duration_days' => $line->durationDays,
                    'unit_amount' => $line->unitAmount,
                    'discount_amount' => $line->discountAmount,
                    'total_amount' => $line->totalAmount(),
                ]);
            }

            $this->carts->clear($cart);
            $this->audit->log('order.created', $order, ['total' => $order->total_amount], $user);

            return $order;
        });

        if ($order->total_amount === 0) {
            $this->processor->completeFreeOrder($order);
        }

        return $order->refresh();
    }
}
