<?php

namespace App\Services\Commerce;

use App\Enums\CouponType;
use App\Enums\OrderStatus;
use App\Exceptions\DomainException;
use App\Models\Coupon;
use App\Models\CouponRedemption;
use App\Models\Order;
use App\Models\User;
use App\Support\Money;

class CouponValidator
{
    public function findByCode(string $code): Coupon
    {
        $coupon = Coupon::query()->where('code', Coupon::normalizeCode($code))->first();
        if (! $coupon || ! $coupon->is_active) {
            throw new DomainException(__('commerce.coupon_invalid'), 'coupon_invalid');
        }

        return $coupon;
    }

    /**
     * Throws a DomainException describing why the coupon cannot be used.
     *
     * @param  list<PriceLine>  $lines
     */
    public function assertUsable(Coupon $coupon, User $user, array $lines): void
    {
        if (! $coupon->is_active) {
            throw new DomainException(__('commerce.coupon_invalid'), 'coupon_invalid');
        }
        if ($coupon->starts_at && $coupon->starts_at->isFuture()) {
            throw new DomainException(__('commerce.coupon_not_started'), 'coupon_not_started');
        }
        if ($coupon->expires_at && $coupon->expires_at->isPast()) {
            throw new DomainException(__('commerce.coupon_expired'), 'coupon_expired');
        }
        // Unpaid orders holding the coupon count as reserved uses, so limits
        // cannot be exceeded by opening several orders and paying them all.
        if ($coupon->usage_limit !== null && $coupon->used_count + $this->pendingUses($coupon) >= $coupon->usage_limit) {
            throw new DomainException(__('commerce.coupon_exhausted'), 'coupon_exhausted');
        }
        if ($coupon->usage_limit_per_user !== null) {
            $used = CouponRedemption::query()->where('coupon_id', $coupon->id)->where('user_id', $user->id)->count()
                + $this->pendingUses($coupon, $user);
            if ($used >= $coupon->usage_limit_per_user) {
                throw new DomainException(__('commerce.coupon_user_limit'), 'coupon_user_limit');
            }
        }

        $eligible = $this->eligibleSubtotal($coupon, $lines);
        if ($eligible === 0) {
            throw new DomainException(__('commerce.coupon_not_applicable'), 'coupon_not_applicable');
        }
        if ($coupon->min_subtotal_amount !== null && $eligible < $coupon->min_subtotal_amount) {
            throw new DomainException(
                __('commerce.coupon_min_subtotal', ['amount' => number_format(Money::toMajor($coupon->min_subtotal_amount), 2).' '.config('platform.commerce.currency')]),
                'coupon_min_subtotal',
            );
        }
    }

    /**
     * @param  list<PriceLine>  $lines
     */
    public function eligibleSubtotal(Coupon $coupon, array $lines): int
    {
        return array_sum(array_map(
            fn (PriceLine $l) => $coupon->applies_to->matches($l->type) ? $l->unitAmount : 0,
            $lines,
        ));
    }

    /**
     * Total discount for the cart, never more than the eligible amount.
     *
     * @param  list<PriceLine>  $lines
     */
    public function discountFor(Coupon $coupon, array $lines): int
    {
        $eligible = $this->eligibleSubtotal($coupon, $lines);

        $discount = match ($coupon->type) {
            CouponType::Percent => intdiv($eligible * min(100, $coupon->value), 100),
            CouponType::Fixed => $coupon->value,
        };
        if ($coupon->max_discount_amount !== null) {
            $discount = min($discount, $coupon->max_discount_amount);
        }

        return max(0, min($discount, $eligible));
    }

    /** Unpaid orders currently holding this coupon (optionally for one user). */
    public function pendingUses(Coupon $coupon, ?User $user = null): int
    {
        return Order::query()
            ->where('coupon_id', $coupon->id)
            ->when($user, fn ($q) => $q->where('user_id', $user->id))
            ->whereIn('status', [OrderStatus::Pending, OrderStatus::Failed])
            ->count();
    }
}
