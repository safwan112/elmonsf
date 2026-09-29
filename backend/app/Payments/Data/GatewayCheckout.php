<?php

namespace App\Payments\Data;

final readonly class GatewayCheckout
{
    /**
     * @param  array<string, mixed>  $raw
     */
    public function __construct(
        public string $invoiceId,
        public string $paymentUrl,
        public array $raw = [],
    ) {}
}
