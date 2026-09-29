<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentWebhookEvent extends Model
{
    protected $fillable = [
        'provider', 'idempotency_key', 'event_type', 'provider_invoice_id', 'provider_payment_id',
        'signature_valid', 'status', 'payload', 'error', 'ip_address', 'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'signature_valid' => 'boolean',
            'payload' => 'array',
            'processed_at' => 'datetime',
        ];
    }
}
