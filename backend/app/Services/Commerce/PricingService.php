<?php

namespace App\Services\Commerce;

use App\Models\Coupon;
use App\Models\User;

class PricingService
{
    public function __construct(private readonly CouponValidator $coupons) {}

    /**
     * Price lines with an optional coupon. Prices are VAT-inclusive; the VAT
     * portion is reported separately for the invoice.
     *
     * @param  list<PriceLine>  $lines
     */
    public function summarize(array $lines, ?Coupon $coupon, ?User $user = null, bool $validateCoupon = true): PriceSummary
    {
        $subtotal = array_sum(array_map(fn (PriceLine $l) => $l->unitAmount, $lines));

        $discount = 0;
        if ($coupon && $lines !== []) {
            if ($validateCoupon && $user) {
                $this->coupons->assertUsable($coupon, $user, $lines);
            }
            $discount = $this->coupons->discountFor($coupon, $lines);
            $this->allocate($discount, array_values(array_filter($lines, fn (PriceLine $l) => $coupon->applies_to->matches($l->type))));
        }

        $total = $subtotal - $discount;
        $rate = (int) config('platform.commerce.vat_rate');
        $tax = $total - (int) round($total * 100 / (100 + $rate));

        return new PriceSummary($lines, $subtotal, $discount, $tax, $total, config('platform.commerce.currency'), $rate, $discount > 0 ? $coupon : null);
    }

    /**
     * Spread a discount across lines proportionally (largest remainder), so
     * line totals always add up to the order total.
     *
     * @param  list<PriceLine>  $lines
     */
    private function allocate(int $discount, array $lines): void
    {
        $base = array_sum(array_map(fn (PriceLine $l) => $l->unitAmount, $lines));
        if ($discount === 0 || $base === 0) {
            return;
        }

        $remainders = [];
        $allocated = 0;
        foreach ($lines as $i => $line) {
            $exact = $discount * $line->unitAmount / $base;
            $line->discountAmount = (int) floor($exact);
            $allocated += $line->discountAmount;
            $remainders[$i] = $exact - floor($exact);
        }

        arsort($remainders);
        foreach (array_keys($remainders) as $i) {
            if ($allocated >= $discount) {
                break;
            }
            $lines[$i]->discountAmount++;
            $allocated++;
        }
    }
}
