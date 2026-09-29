<?php

namespace App\Payments\Contracts;

use App\Models\Order;
use App\Models\Payment;
use App\Payments\Data\GatewayCheckout;
use App\Payments\Data\GatewayPayment;
use App\Payments\Data\WebhookNotification;
use App\Payments\PaymentGatewayException;
use Illuminate\Http\Request;

/**
 * A payment provider. Implementations translate between the provider's API
 * and these provider-neutral value objects; business rules (amount checks,
 * idempotency, fulfilment) live in App\Services\Payments.
 */
interface PaymentGateway
{
    /** Stable identifier stored on payments, e.g. "myfatoorah". */
    public function name(): string;

    /**
     * Create a hosted payment for the order and return where to send the
     * customer.
     *
     * @throws PaymentGatewayException
     */
    public function createPayment(Order $order, Payment $payment, string $returnUrl): GatewayCheckout;

    /**
     * Fetch the authoritative state of a payment from the provider.
     *
     * @throws PaymentGatewayException
     */
    public function fetchPayment(string $providerPaymentId): GatewayPayment;

    /**
     * Parse and authenticate an incoming webhook. Never trusted for status:
     * callers re-verify with fetchPayment().
     */
    public function parseWebhook(Request $request): WebhookNotification;
}
