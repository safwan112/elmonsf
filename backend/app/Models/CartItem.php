<?php

namespace App\Models;

use App\Enums\PurchasableType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CartItem extends Model
{
    protected $fillable = ['cart_id', 'purchasable_type', 'purchasable_id', 'course_id'];

    protected function casts(): array
    {
        return ['purchasable_type' => PurchasableType::class];
    }

    public function cart(): BelongsTo
    {
        return $this->belongsTo(Cart::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(CoursePlan::class, 'purchasable_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'purchasable_id');
    }
}
