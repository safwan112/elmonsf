<?php

namespace App\Services\Commerce;

use App\Models\Coupon;

final class PriceSummary
{
    /**
     * @param  list<PriceLine>  $lines
     */
    public function __construct(
        public readonly array $lines,
        public readonly int $subtotal,
        public readonly int $discount,
        public readonly int $tax,
        public readonly int $total,
        public readonly string $currency,
        public readonly int $vatRate,
        public readonly ?Coupon $coupon,
    ) {}
}
