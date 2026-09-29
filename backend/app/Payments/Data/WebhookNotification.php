<?php

namespace App\Payments\Data;

final readonly class WebhookNotification
{
    /**
     * @param  bool  $actionable  whether this event type concerns payment status
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public string $idempotencyKey,
        public ?string $eventType,
        public bool $signatureValid,
        public bool $actionable,
        public ?string $invoiceId,
        public ?string $paymentId,
        public array $payload,
    ) {}
}
