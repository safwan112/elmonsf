<?php

namespace App\Console\Commands;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Payments\PaymentGatewayException;
use App\Services\Payments\PaymentProcessor;
use Illuminate\Console\Command;
use Throwable;

/**
 * Reconcile, then cancel, orders left unpaid. Pending payments are checked
 * with the provider first, so a payment whose webhook was missed is still
 * captured instead of being cancelled.
 */
class CancelStalePendingOrders extends Command
{
    protected $signature = 'orders:cancel-stale';

    protected $description = 'Reconcile pending payments and cancel orders left unpaid';

    public function handle(PaymentProcessor $processor): int
    {
        $cutoff = now()->subHours((int) config('platform.commerce.pending_order_ttl_hours'));
        $cancelled = 0;

        Order::query()
            ->whereIn('status', [OrderStatus::Pending, OrderStatus::Failed])
            ->where('created_at', '<', $cutoff)
            ->with(['payments' => fn ($q) => $q->where('status', PaymentStatus::Pending)->whereNotNull('provider_payment_id')])
            ->chunkById(100, function ($orders) use ($processor, &$cancelled) {
                foreach ($orders as $order) {
                    /** @var Payment $payment */
                    foreach ($order->payments as $payment) {
                        try {
                            $processor->syncByProviderPaymentId($payment->provider, $payment->provider_payment_id);
                        } catch (PaymentGatewayException|Throwable $e) {
                            report($e);
                        }
                    }

                    $cancelled += Order::query()
                        ->whereKey($order->id)
                        ->whereIn('status', [OrderStatus::Pending, OrderStatus::Failed])
                        ->update(['status' => OrderStatus::Cancelled, 'cancelled_at' => now(), 'updated_at' => now()]);
                }
            });

        $this->info("Cancelled {$cancelled} stale order(s).");

        return self::SUCCESS;
    }
}
