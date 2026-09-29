<?php

namespace App\Services\Commerce;

use App\Enums\PurchasableType;
use App\Models\Coupon;
use App\Models\CouponRedemption;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ProductEntitlement;

/**
 * Everything a paid order grants. Idempotent and designed to run inside the
 * same transaction that marks the order paid.
 */
class OrderFulfillment
{
    public function __construct(
        private readonly EnrollmentService $enrollments,
        private readonly InvoiceService $invoices,
    ) {}

    public function fulfill(Order $order): void
    {
        $order->loadMissing('items');

        /** @var OrderItem $item */
        foreach ($order->items as $item) {
            if ($item->purchasable_type === PurchasableType::CoursePlan && $item->course_id) {
                $this->enrollments->grant($order->user_id, $item->course_id, $item->duration_days, $item->purchasable_id, $order);
            }

            if ($item->purchasable_type === PurchasableType::Product && $item->product_id) {
                $entitlement = ProductEntitlement::query()->firstOrNew([
                    'user_id' => $order->user_id,
                    'product_id' => $item->product_id,
                ]);
                $entitlement->fill(['order_id' => $order->id, 'granted_at' => now(), 'revoked_at' => null])->save();
            }
        }

        if ($order->coupon_id) {
            $redemption = CouponRedemption::query()->firstOrCreate(
                ['order_id' => $order->id],
                ['coupon_id' => $order->coupon_id, 'user_id' => $order->user_id, 'discount_amount' => $order->discount_amount],
            );
            if ($redemption->wasRecentlyCreated) {
                Coupon::query()->whereKey($order->coupon_id)->increment('used_count');
            }
        }

        $this->invoices->issue($order);
    }
}
