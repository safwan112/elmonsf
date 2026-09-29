<?php

use App\Enums\OrderStatus;
use App\Models\Coupon;
use App\Models\Enrollment;
use App\Models\Order;
use App\Models\User;

it('requires a verified email to check out', function () {
    $user = User::factory()->unverified()->student()->create();
    addToCart($this, $user, 'course_plan', courseWithPlans()->plans()->first()->id);

    $this->actingAs($user)->postJson('/api/v1/checkout', ['accept_terms' => true])
        ->assertForbidden()
        ->assertJsonPath('code', 'email_unverified');
});

it('requires accepting the terms and a non-empty cart', function () {
    $user = buyer();

    $this->actingAs($user)->postJson('/api/v1/checkout', [])->assertUnprocessable()->assertJsonValidationErrors(['accept_terms']);
    $this->actingAs($user)->postJson('/api/v1/checkout', ['accept_terms' => true])->assertUnprocessable()->assertJsonPath('code', 'cart_empty');
});

it('creates a pending order from the live catalog and clears the cart', function () {
    $user = buyer();
    $course = courseWithPlans();
    $plan = $course->plans()->first();
    addToCart($this, $user, 'course_plan', $plan->id);

    // The price changes after adding to the cart: checkout uses the current price.
    $plan->update(['price_amount' => 17900]);

    $response = $this->actingAs($user)
        ->postJson('/api/v1/checkout', ['accept_terms' => true, 'billing_name' => 'ريم الشهري', 'billing_phone' => '+966 50 000 0000'])
        ->assertCreated()
        ->assertJsonPath('data.status.value', 'pending')
        ->assertJsonPath('data.is_payable', true)
        ->assertJsonPath('data.total.amount_minor', 17900)
        ->assertJsonPath('data.billing.name', 'ريم الشهري')
        ->assertJsonPath('data.billing.phone', '+966500000000')
        ->assertJsonPath('data.items.0.title', $course->title)
        ->assertJsonPath('data.items.0.duration_days', $plan->duration_days);

    expect($response->json('data.number'))->toMatch('/^ORD-\d{4}-\d{6}$/');
    $this->actingAs($user)->getJson('/api/v1/cart')->assertJsonPath('data.count', 0);
    expect(Enrollment::count())->toBe(0);
});

it('snapshots items so later catalog edits do not change the order', function () {
    $user = buyer();
    $course = courseWithPlans();
    addToCart($this, $user, 'course_plan', $course->plans()->first()->id);
    $number = placeOrder($this, $user);
    $originalTitle = $course->title;

    $course->update(['title' => 'عنوان جديد']);
    $course->plans()->update(['price_amount' => 1]);

    $this->actingAs($user)->getJson("/api/v1/orders/{$number}")
        ->assertJsonPath('data.items.0.title', $originalTitle)
        ->assertJsonPath('data.total.amount_minor', 19900);
});

it('completes free orders immediately without the gateway', function () {
    $user = buyer();
    $course = courseWithPlans();
    addToCart($this, $user, 'course_plan', $course->plans()->first()->id);
    Coupon::factory()->create(['code' => 'FREE', 'value' => 100]);
    $this->actingAs($user)->postJson('/api/v1/cart/coupon', ['code' => 'FREE'])->assertOk();

    $number = placeOrder($this, $user);

    $order = Order::where('number', $number)->first();
    expect($order->status)->toBe(OrderStatus::Paid)
        ->and($order->total_amount)->toBe(0)
        ->and($order->invoice)->not->toBeNull()
        ->and(Enrollment::where('user_id', $user->id)->where('course_id', $course->id)->exists())->toBeTrue()
        ->and(Coupon::where('code', 'FREE')->first()->used_count)->toBe(1);
});

it('reserves limited coupons held by unpaid orders', function () {
    $user = buyer();
    Coupon::factory()->create(['code' => 'ONCE', 'usage_limit_per_user' => 1]);

    addToCart($this, $user, 'course_plan', courseWithPlans()->plans()->first()->id);
    $this->actingAs($user)->postJson('/api/v1/cart/coupon', ['code' => 'ONCE'])->assertOk();
    placeOrder($this, $user);

    addToCart($this, $user, 'course_plan', courseWithPlans()->plans()->first()->id);
    $this->actingAs($user)->postJson('/api/v1/cart/coupon', ['code' => 'ONCE'])
        ->assertUnprocessable()
        ->assertJsonPath('code', 'coupon_user_limit');
});

it('lets users see and cancel only their own orders', function () {
    $owner = buyer();
    $other = buyer();
    addToCart($this, $owner, 'course_plan', courseWithPlans()->plans()->first()->id);
    $number = placeOrder($this, $owner);

    $this->actingAs($other)->getJson("/api/v1/orders/{$number}")->assertForbidden();
    $this->actingAs($other)->postJson("/api/v1/orders/{$number}/cancel")->assertForbidden();
    $this->actingAs($other)->getJson('/api/v1/orders')->assertJsonCount(0, 'data');

    $this->actingAs($owner)->getJson('/api/v1/orders')->assertJsonCount(1, 'data');
    $this->actingAs($owner)->postJson("/api/v1/orders/{$number}/cancel")->assertOk()->assertJsonPath('data.status.value', 'cancelled');
    $this->actingAs($owner)->postJson("/api/v1/orders/{$number}/cancel")->assertStatus(409);
});
