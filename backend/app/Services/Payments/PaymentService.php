<?php

namespace App\Services\Payments;

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Exceptions\DomainException;
use App\Models\Order;
use App\Models\Payment;
use App\Payments\PaymentGatewayException;
use App\Payments\PaymentGatewayManager;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentService
{
    public function __construct(
        private readonly PaymentGatewayManager $gateways,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Start (or resume) a hosted payment for an order. An unfinished payment
     * link for the same amount is reused instead of creating a second
     * invoice at the provider.
     */
    public function start(Order $order, string $provider): Payment
    {
        $gateway = $this->gateways->driver($provider);

        [$payment, $reused] = DB::transaction(function () use ($order, $gateway) {
            /** @var Order $locked */
            $locked = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();

            if (! $locked->status->isPayable() || $locked->total_amount <= 0) {
                throw new DomainException(__('commerce.order_not_payable'), 'order_not_payable', 409);
            }

            $existing = $locked->payments()
                ->where('provider', $gateway->name())
                ->where('status', PaymentStatus::Pending)
                ->whereNotNull('payment_url')
                ->where('amount', $locked->total_amount)
                ->where('created_at', '>=', now()->subMinutes((int) config('platform.commerce.payment_link_ttl_minutes')))
                ->first();

            if ($existing) {
                return [$existing, true];
            }

            if ($locked->status === OrderStatus::Failed) {
                $locked->forceFill(['status' => OrderStatus::Pending, 'failure_reason' => null])->save();
            }

            return [$locked->payments()->create([
                'provider' => $gateway->name(),
                'status' => PaymentStatus::Pending,
                'amount' => $locked->total_amount,
                'currency' => $locked->currency,
            ]), false];
        });

        if ($reused) {
            return $payment;
        }

        // The provider call happens outside the transaction so no row locks
        // are held during network I/O.
        try {
            $checkout = $gateway->createPayment($order, $payment, $this->returnUrl($provider));
        } catch (PaymentGatewayException $e) {
            report($e);
            $payment->forceFill(['status' => PaymentStatus::Failed, 'failure_reason' => 'gateway_error'])->save();
            Log::error('payments.create_failed', ['order' => $order->number, 'provider' => $provider]);

            throw new DomainException(__('commerce.payment_unavailable'), 'payment_gateway_unavailable', 502);
        }

        $payment->forceFill([
            'provider_invoice_id' => $checkout->invoiceId,
            'payment_url' => $checkout->paymentUrl,
            'gateway_response' => $checkout->raw,
        ])->save();

        $this->audit->log('payment.started', $order, ['payment_id' => $payment->id, 'provider' => $provider]);

        return $payment;
    }

    private function returnUrl(string $provider): string
    {
        return (string) (config("services.{$provider}.callback_url") ?: route("api.v1.payments.{$provider}.callback"));
    }
}
