<?php

namespace App\Services\Payments;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\RoleName;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use App\Notifications\OrderPaidNotification;
use App\Notifications\PaymentFailedNotification;
use App\Notifications\PaymentNeedsReviewNotification;
use App\Payments\Data\GatewayPayment;
use App\Payments\PaymentGatewayManager;
use App\Services\AuditLogger;
use App\Services\Commerce\OrderFulfillment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * The single place where payment results change orders. Every path
 * (customer redirect, webhook, reconciliation) re-fetches the payment from
 * the provider and funnels through apply(), which is:
 *
 *  - verified: the provider's invoice id, amount and currency must match;
 *  - idempotent: a paid payment is never processed twice;
 *  - transactional: order + payment rows are locked, fulfilment runs in the
 *    same transaction;
 *  - duplicate-safe: a second successful payment for an already-paid order
 *    is flagged for refund, never fulfilled again.
 */
class PaymentProcessor
{
    public function __construct(
        private readonly PaymentGatewayManager $gateways,
        private readonly OrderFulfillment $fulfillment,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Verify a payment with the provider by its provider payment id.
     *
     * @throws PaymentVerificationException when the payment is not ours
     */
    public function syncByProviderPaymentId(string $provider, string $providerPaymentId): Payment
    {
        $verified = $this->gateways->driver($provider)->fetchPayment($providerPaymentId);

        $payment = Payment::query()
            ->where('provider', $provider)
            ->where(function ($q) use ($verified, $providerPaymentId) {
                $q->where('provider_payment_id', $providerPaymentId);
                if ($verified->invoiceId !== null) {
                    $q->orWhere('provider_invoice_id', $verified->invoiceId);
                }
            })
            ->orderByDesc('id')
            ->first();

        if (! $payment) {
            Log::warning('payments.unknown_payment', ['provider' => $provider, 'payment_id' => $providerPaymentId, 'invoice_id' => $verified->invoiceId]);

            throw new PaymentVerificationException('Payment does not belong to this platform.');
        }

        return $this->apply($payment, $verified);
    }

    public function apply(Payment $payment, GatewayPayment $verified): Payment
    {
        $events = [];

        $payment = DB::transaction(function () use ($payment, $verified, &$events) {
            /** @var Payment $payment */
            $payment = Payment::query()->whereKey($payment->id)->lockForUpdate()->firstOrFail();
            /** @var Order $order */
            $order = Order::query()->whereKey($payment->order_id)->lockForUpdate()->firstOrFail();

            if ($verified->invoiceId !== null && $payment->provider_invoice_id !== null
                && $verified->invoiceId !== $payment->provider_invoice_id) {
                throw new PaymentVerificationException('Provider invoice id does not match the payment.');
            }

            $payment->forceFill([
                'provider_payment_id' => $payment->provider_payment_id ?? $verified->paymentId,
                'verified_at' => now(),
                'gateway_response' => $verified->raw ?: $payment->gateway_response,
            ]);

            // Idempotency: once paid or refunded, nothing can change it here.
            if (in_array($payment->status, [PaymentStatus::Paid, PaymentStatus::Refunded], true)) {
                $payment->save();

                return $payment;
            }

            match ($verified->status) {
                PaymentStatus::Paid => $this->markPaid($payment, $order, $verified, $events),
                PaymentStatus::Failed, PaymentStatus::Cancelled => $this->markUnsuccessful($payment, $order, $verified, $events),
                default => null, // still pending: wait for the next signal
            };

            $payment->save();

            return $payment;
        });

        foreach ($events as $event) {
            $event();
        }

        return $payment;
    }

    /**
     * Orders fully covered by discounts never touch the gateway.
     */
    public function completeFreeOrder(Order $order): void
    {
        DB::transaction(function () use ($order) {
            /** @var Order $locked */
            $locked = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            if ($locked->total_amount !== 0 || $locked->status === OrderStatus::Paid) {
                return;
            }
            $locked->forceFill(['status' => OrderStatus::Paid, 'paid_at' => now()])->save();
            $this->fulfillment->fulfill($locked);
            $this->audit->log('order.paid', $locked, ['method' => 'free'], $locked->user);
        });

        $order->refresh();
        $order->user->notify(new OrderPaidNotification($order));
    }

    /**
     * @param  list<callable>  $events
     */
    private function markPaid(Payment $payment, Order $order, GatewayPayment $verified, array &$events): void
    {
        // Amount/currency verification: never trust a success we cannot match.
        $currencyMatches = $verified->currency === null || $verified->currency === $payment->currency;
        if ($verified->amountMinor === null || $verified->amountMinor !== $payment->amount || ! $currencyMatches) {
            $payment->forceFill(['status' => PaymentStatus::Failed, 'failure_reason' => 'amount_mismatch']);
            Log::critical('payments.amount_mismatch', [
                'payment' => $payment->id,
                'order' => $order->number,
                'expected' => [$payment->amount, $payment->currency],
                'reported' => [$verified->amountMinor, $verified->currency],
            ]);
            $this->audit->log('payment.amount_mismatch', $order, ['payment_id' => $payment->id, 'reported' => $verified->amountMinor], $order->user);
            $events[] = fn () => $this->alertAdmins($order, $payment, 'amount_mismatch');

            return;
        }

        // Duplicate payment: the order was already paid (or refunded) through
        // another payment. Record the money, flag it, do not fulfil again.
        if (in_array($order->status, [OrderStatus::Paid, OrderStatus::Refunded], true)) {
            $payment->forceFill(['status' => PaymentStatus::Paid, 'paid_at' => now(), 'is_duplicate' => true, 'failure_reason' => 'duplicate_payment']);
            Log::warning('payments.duplicate', ['payment' => $payment->id, 'order' => $order->number]);
            $this->audit->log('payment.duplicate', $order, ['payment_id' => $payment->id], $order->user);
            $events[] = fn () => $this->alertAdmins($order, $payment, 'duplicate_payment');

            return;
        }

        $payment->forceFill(['status' => PaymentStatus::Paid, 'paid_at' => now(), 'failure_reason' => null]);
        // Money received also revives an order that was auto-cancelled or failed.
        $order->forceFill(['status' => OrderStatus::Paid, 'paid_at' => now(), 'failure_reason' => null, 'cancelled_at' => null])->save();

        $this->fulfillment->fulfill($order);
        $this->audit->log('order.paid', $order, ['payment_id' => $payment->id, 'provider' => $payment->provider], $order->user);

        $events[] = function () use ($order) {
            $order->refresh()->user->notify(new OrderPaidNotification($order));
        };
    }

    /**
     * @param  list<callable>  $events
     */
    private function markUnsuccessful(Payment $payment, Order $order, GatewayPayment $verified, array &$events): void
    {
        $payment->forceFill(['status' => $verified->status, 'failure_reason' => $verified->failureReason]);

        if ($order->status === OrderStatus::Pending && ! $this->hasOtherOpenPayment($order, $payment)) {
            $order->forceFill(['status' => OrderStatus::Failed, 'failure_reason' => $verified->failureReason])->save();
            $events[] = function () use ($order) {
                $order->user->notify(new PaymentFailedNotification($order));
            };
        }
    }

    private function hasOtherOpenPayment(Order $order, Payment $payment): bool
    {
        return $order->payments()->whereKeyNot($payment->id)->where('status', PaymentStatus::Pending)->whereNotNull('payment_url')->exists();
    }

    private function alertAdmins(Order $order, Payment $payment, string $reason): void
    {
        $admins = User::query()->withRole(RoleName::Admin)->where('status', 'active')->get();
        Notification::send($admins, new PaymentNeedsReviewNotification($order, $payment, $reason));
    }
}
