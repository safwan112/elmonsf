<?php

namespace App\Services\Payments;

use App\Enums\EnrollmentStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Exceptions\DomainException;
use App\Models\Enrollment;
use App\Models\Order;
use App\Models\ProductEntitlement;
use App\Models\Refund;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\DB;

class RefundService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * Record a full refund that was issued in the provider's dashboard, and
     * revoke the access the order granted.
     */
    public function recordManualRefund(Order $order, User $admin, string $reason): Refund
    {
        return DB::transaction(function () use ($order, $admin, $reason) {
            /** @var Order $locked */
            $locked = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            if ($locked->status !== OrderStatus::Paid) {
                throw new DomainException(__('commerce.refund_invalid'), 'refund_invalid', 409);
            }

            $payment = $locked->payments()->where('status', PaymentStatus::Paid)->where('is_duplicate', false)->first();

            $refund = Refund::query()->create([
                'order_id' => $locked->id,
                'payment_id' => $payment?->id,
                'created_by' => $admin->id,
                'amount' => $locked->total_amount,
                'currency' => $locked->currency,
                'reason' => $reason,
                'method' => 'manual',
                'status' => 'succeeded',
                'processed_at' => now(),
            ]);

            $payment?->forceFill(['status' => PaymentStatus::Refunded])->save();
            $locked->forceFill(['status' => OrderStatus::Refunded, 'refunded_at' => now()])->save();

            Enrollment::query()
                ->where('order_id', $locked->id)
                ->update(['status' => EnrollmentStatus::Revoked, 'revoked_at' => now(), 'updated_at' => now()]);
            ProductEntitlement::query()
                ->where('order_id', $locked->id)
                ->update(['revoked_at' => now(), 'updated_at' => now()]);

            $this->audit->log('order.refunded', $locked, ['refund_id' => $refund->id, 'reason' => $reason], $admin);

            return $refund;
        });
    }
}
