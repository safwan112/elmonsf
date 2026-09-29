<?php

namespace App\Payments\Data;

use App\Enums\PaymentStatus;

/**
 * Provider-verified state of a payment.
 */
final readonly class GatewayPayment
{
    /**
     * @param  int|null  $amountMinor  paid/invoiced amount in minor units, null if the provider did not report it
     * @param  array<string, mixed>  $raw
     */
    public function __construct(
        public string $paymentId,
        public ?string $invoiceId,
        public PaymentStatus $status,
        public ?int $amountMinor,
        public ?string $currency,
        public ?string $failureReason = null,
        public array $raw = [],
    ) {}
}
