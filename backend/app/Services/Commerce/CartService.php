<?php

namespace App\Services\Commerce;

use App\Enums\PurchasableType;
use App\Exceptions\DomainException;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\CoursePlan;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CartService
{
    public function __construct(
        private readonly PricingService $pricing,
        private readonly CouponValidator $coupons,
    ) {}

    public function forUser(User $user): Cart
    {
        return Cart::query()->firstOrCreate(['user_id' => $user->id]);
    }

    /**
     * Add a plan or product. A cart holds one plan per course: choosing a
     * different plan of the same course replaces the previous one.
     */
    public function add(User $user, PurchasableType $type, int $id): Cart
    {
        $cart = $this->forUser($user);

        DB::transaction(function () use ($cart, $user, $type, $id) {
            if ($type === PurchasableType::CoursePlan) {
                $plan = $this->purchasablePlan($id);
                $cart->items()->where('course_id', $plan->course_id)->delete();
                $cart->items()->create([
                    'purchasable_type' => $type,
                    'purchasable_id' => $plan->id,
                    'course_id' => $plan->course_id,
                ]);

                return;
            }

            $product = $this->purchasableProduct($id);
            if ($user->productEntitlements()->where('product_id', $product->id)->whereNull('revoked_at')->exists()) {
                throw new DomainException(__('commerce.already_owned'), 'already_owned');
            }
            $cart->items()->firstOrCreate(['purchasable_type' => $type, 'purchasable_id' => $product->id]);
        });

        return $cart->refresh();
    }

    public function remove(User $user, int $itemId): Cart
    {
        $cart = $this->forUser($user);
        $cart->items()->whereKey($itemId)->delete();

        return $cart->refresh();
    }

    public function applyCoupon(User $user, string $code): Cart
    {
        $cart = $this->forUser($user);
        $coupon = $this->coupons->findByCode($code);
        [$lines] = $this->lines($cart);

        if ($lines === []) {
            throw new DomainException(__('commerce.cart_empty'), 'cart_empty');
        }
        $this->coupons->assertUsable($coupon, $user, $lines);

        $cart->forceFill(['coupon_id' => $coupon->id])->save();

        return $cart->refresh();
    }

    public function removeCoupon(User $user): Cart
    {
        $cart = $this->forUser($user);
        $cart->forceFill(['coupon_id' => null])->save();

        return $cart->refresh();
    }

    public function clear(Cart $cart): void
    {
        $cart->items()->delete();
        $cart->forceFill(['coupon_id' => null])->save();
    }

    /**
     * Current pricing. Unavailable items are reported (and removed) and an
     * unusable coupon is detached, so the cart is always consistent.
     *
     * @return array{0: PriceSummary, 1: list<string>, 2: ?string} [summary, removed item titles, coupon error]
     */
    public function summarize(Cart $cart, User $user): array
    {
        [$lines, $removed] = $this->lines($cart, prune: true);

        $coupon = $cart->coupon;
        $couponError = null;
        if ($coupon) {
            try {
                if ($lines === []) {
                    throw new DomainException(__('commerce.cart_empty'), 'cart_empty');
                }
                $this->coupons->assertUsable($coupon, $user, $lines);
            } catch (DomainException $e) {
                $couponError = $e->getMessage();
                $cart->forceFill(['coupon_id' => null])->save();
                $coupon = null;
            }
        }

        return [$this->pricing->summarize($lines, $coupon, $user, validateCoupon: false), $removed, $couponError];
    }

    /**
     * Build price lines from the live catalog.
     *
     * @return array{0: list<PriceLine>, 1: list<string>}
     */
    public function lines(Cart $cart, bool $prune = false): array
    {
        $items = $cart->items()->with(['plan.course', 'product'])->get();
        $lines = [];
        $removed = [];

        /** @var CartItem $item */
        foreach ($items as $item) {
            $line = $this->lineFor($item);
            if ($line === null) {
                $removed[] = $item->plan?->course?->title ?? $item->product?->title ?? '—';
                if ($prune) {
                    $item->delete();
                }

                continue;
            }
            $lines[] = $line;
        }

        return [$lines, $removed];
    }

    private function lineFor(CartItem $item): ?PriceLine
    {
        if ($item->purchasable_type === PurchasableType::CoursePlan) {
            $plan = $item->plan;
            if (! $plan || ! $plan->is_active || ! $plan->course || ! $plan->course->isPublished()) {
                return null;
            }

            return new PriceLine(
                type: PurchasableType::CoursePlan,
                purchasableId: $plan->id,
                title: $plan->course->title,
                unitAmount: $plan->price_amount,
                courseId: $plan->course_id,
                planName: $plan->name,
                durationDays: $plan->duration_days,
                slug: $plan->course->slug,
                cartItemId: $item->id,
            );
        }

        $product = $item->product;
        if (! $product || ! $product->isPublished()) {
            return null;
        }

        return new PriceLine(
            type: PurchasableType::Product,
            purchasableId: $product->id,
            title: $product->title,
            unitAmount: $product->price_amount,
            productId: $product->id,
            slug: $product->slug,
            cartItemId: $item->id,
        );
    }

    private function purchasablePlan(int $id): CoursePlan
    {
        $plan = CoursePlan::query()->with('course')->find($id);
        if (! $plan || ! $plan->is_active || ! $plan->course || ! $plan->course->isPublished()) {
            throw new DomainException(__('commerce.item_unavailable'), 'item_unavailable');
        }

        return $plan;
    }

    private function purchasableProduct(int $id): Product
    {
        $product = Product::query()->find($id);
        if (! $product || ! $product->isPublished()) {
            throw new DomainException(__('commerce.item_unavailable'), 'item_unavailable');
        }

        return $product;
    }
}
