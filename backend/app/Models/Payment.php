<?php

namespace App\Models;

use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id', 'provider', 'status', 'amount', 'currency', 'provider_invoice_id', 'provider_payment_id',
        'payment_url', 'failure_reason', 'is_duplicate', 'verified_at', 'paid_at', 'gateway_response',
    ];

    protected $hidden = ['gateway_response', 'paid_order_id'];

    protected function casts(): array
    {
        return [
            'status' => PaymentStatus::class,
            'amount' => 'integer',
            'is_duplicate' => 'boolean',
            'verified_at' => 'datetime',
            'paid_at' => 'datetime',
            'gateway_response' => 'array',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
