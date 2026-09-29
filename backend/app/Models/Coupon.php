<?php

namespace App\Models;

use App\Enums\CouponScope;
use App\Enums\CouponType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Coupon extends Model
{
    use HasFactory;

    protected $fillable = [
        'code', 'description', 'type', 'value', 'max_discount_amount', 'min_subtotal_amount',
        'applies_to', 'starts_at', 'expires_at', 'usage_limit', 'usage_limit_per_user', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'type' => CouponType::class,
            'applies_to' => CouponScope::class,
            'value' => 'integer',
            'max_discount_amount' => 'integer',
            'min_subtotal_amount' => 'integer',
            'usage_limit' => 'integer',
            'usage_limit_per_user' => 'integer',
            'used_count' => 'integer',
            'is_active' => 'boolean',
            'starts_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::saving(fn (self $coupon) => $coupon->code = self::normalizeCode($coupon->code));
    }

    public static function normalizeCode(string $code): string
    {
        return Str::upper(trim($code));
    }

    public function redemptions(): HasMany
    {
        return $this->hasMany(CouponRedemption::class);
    }
}
