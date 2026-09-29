<?php

use App\Models\Coupon;
use App\Models\Course;
use App\Models\Product;
use App\Models\ProductEntitlement;

it('requires authentication for the cart', function () {
    $this->getJson('/api/v1/cart')->assertUnauthorized();
});

it('adds a course plan and prices the cart with VAT included', function () {
    $user = buyer();
    $plan = courseWithPlans()->plans()->first();

    $this->actingAs($user)
        ->postJson('/api/v1/cart/items', ['type' => 'course_plan', 'id' => $plan->id])
        ->assertCreated()
        ->assertJsonPath('data.count', 1)
        ->assertJsonPath('data.items.0.plan_name', $plan->name)
        ->assertJsonPath('data.subtotal.amount_minor', 19900)
        ->assertJsonPath('data.total.amount_minor', 19900)
        // 15% VAT included: 19900 - round(19900 * 100 / 115)
        ->assertJsonPath('data.tax.amount_minor', 19900 - (int) round(19900 * 100 / 115))
        ->assertJsonPath('data.vat_rate', 15);
});

it('keeps only one plan per course', function () {
    $user = buyer();
    [$three, $six] = courseWithPlans()->plans()->get()->all();

    addToCart($this, $user, 'course_plan', $three->id);
    addToCart($this, $user, 'course_plan', $six->id);

    $this->actingAs($user)->getJson('/api/v1/cart')
        ->assertJsonPath('data.count', 1)
        ->assertJsonPath('data.items.0.purchasable_id', $six->id);
});

it('rejects unpublished courses, inactive plans and draft products', function () {
    $user = buyer();
    $draftPlan = Course::factory()->draft()->withPlans()->create()->plans()->first();
    $inactive = courseWithPlans()->plans()->first();
    $inactive->update(['is_active' => false]);
    $draftProduct = Product::factory()->draft()->create();

    foreach ([['course_plan', $draftPlan->id], ['course_plan', $inactive->id], ['product', $draftProduct->id], ['product', 999999]] as [$type, $id]) {
        $this->actingAs($user)
            ->postJson('/api/v1/cart/items', ['type' => $type, 'id' => $id])
            ->assertUnprocessable()
            ->assertJsonPath('code', 'item_unavailable');
    }
});

it('does not sell a product the user already owns', function () {
    $user = buyer();
    $product = Product::factory()->create();
    ProductEntitlement::query()->create(['user_id' => $user->id, 'product_id' => $product->id, 'granted_at' => now()]);

    $this->actingAs($user)
        ->postJson('/api/v1/cart/items', ['type' => 'product', 'id' => $product->id])
        ->assertUnprocessable()
        ->assertJsonPath('code', 'already_owned');
});

it('removes items and drops items that become unavailable', function () {
    $user = buyer();
    $course = courseWithPlans();
    $product = Product::factory()->create(['price_amount' => 4900]);
    addToCart($this, $user, 'course_plan', $course->plans()->first()->id);
    addToCart($this, $user, 'product', $product->id);

    $product->update(['status' => 'draft']);

    $this->actingAs($user)->getJson('/api/v1/cart')
        ->assertJsonPath('data.count', 1)
        ->assertJsonPath('data.notices.0.code', 'items_removed');

    $itemId = $this->actingAs($user)->getJson('/api/v1/cart')->json('data.items.0.id');
    $this->actingAs($user)->deleteJson("/api/v1/cart/items/{$itemId}")->assertOk()->assertJsonPath('data.count', 0);
});

it('applies percent and fixed coupons with caps and scopes', function () {
    $user = buyer();
    addToCart($this, $user, 'course_plan', courseWithPlans()->plans()->first()->id); // 199.00
    addToCart($this, $user, 'product', Product::factory()->create(['price_amount' => 5000])->id); // 50.00

    $percent = Coupon::factory()->create(['code' => 'save20', 'value' => 20]);
    $this->actingAs($user)->postJson('/api/v1/cart/coupon', ['code' => 'SAVE20'])
        ->assertOk()
        ->assertJsonPath('data.coupon.code', 'SAVE20')
        ->assertJsonPath('data.discount.amount_minor', 4980) // 20% of 24900
        ->assertJsonPath('data.total.amount_minor', 19920);

    $percent->update(['max_discount_amount' => 1000]);
    $this->actingAs($user)->getJson('/api/v1/cart')->assertJsonPath('data.discount.amount_minor', 1000);

    Coupon::factory()->fixed(3000)->create(['code' => 'PRODUCTS30', 'applies_to' => 'products']);
    $this->actingAs($user)->postJson('/api/v1/cart/coupon', ['code' => 'products30'])
        // Fixed 30 SAR, applied only to the 50 SAR product line.
        ->assertJsonPath('data.discount.amount_minor', 3000)
        ->assertJsonPath('data.items.0.discount.amount_minor', 0)
        ->assertJsonPath('data.items.1.discount.amount_minor', 3000);
});

it('rejects invalid, expired, not-started, exhausted and below-minimum coupons', function () {
    $user = buyer();
    addToCart($this, $user, 'course_plan', courseWithPlans()->plans()->first()->id);

    Coupon::factory()->create(['code' => 'OLD', 'expires_at' => now()->subDay()]);
    Coupon::factory()->create(['code' => 'SOON', 'starts_at' => now()->addDay()]);
    Coupon::factory()->create(['code' => 'USEDUP', 'usage_limit' => 1])->forceFill(['used_count' => 1])->save();
    Coupon::factory()->create(['code' => 'BIGCART', 'min_subtotal_amount' => 100000]);
    Coupon::factory()->create(['code' => 'OFF', 'is_active' => false]);
    Coupon::factory()->create(['code' => 'ONLYPRODUCTS', 'applies_to' => 'products']);

    foreach (['NOPE' => 'coupon_invalid', 'OFF' => 'coupon_invalid', 'OLD' => 'coupon_expired', 'SOON' => 'coupon_not_started',
        'USEDUP' => 'coupon_exhausted', 'BIGCART' => 'coupon_min_subtotal', 'ONLYPRODUCTS' => 'coupon_not_applicable'] as $code => $error) {
        $this->actingAs($user)->postJson('/api/v1/cart/coupon', ['code' => $code])
            ->assertUnprocessable()
            ->assertJsonPath('code', $error);
    }
});
