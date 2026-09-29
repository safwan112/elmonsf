<?php

namespace App\Models;

use App\Enums\PurchasableType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    protected $fillable = [
        'order_id', 'purchasable_type', 'purchasable_id', 'course_id', 'product_id', 'title', 'plan_name',
        'duration_days', 'unit_amount', 'discount_amount', 'total_amount',
    ];

    protected function casts(): array
    {
        return [
            'purchasable_type' => PurchasableType::class,
            'duration_days' => 'integer',
            'unit_amount' => 'integer',
            'discount_amount' => 'integer',
            'total_amount' => 'integer',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
