<?php

use App\Enums\EnrollmentStatus;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Enrollment;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\Payment;
use App\Models\PaymentWebhookEvent;
use App\Models\Product;
use App\Models\ProductEntitlement;
use App\Models\User;
use App\Notifications\OrderPaidNotification;
use App\Notifications\PaymentNeedsReviewNotification;
use App\Payments\MyFatoorah\MyFatoorahGateway;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Notification::fake();
    $this->user = buyer();
    $this->course = courseWithPlans();
    $this->plan = $this->course->plans()->where('duration_days', 90)->first();
    addToCart($this, $this->user, 'course_plan', $this->plan->id);
    $this->orderNumber = placeOrder($this, $this->user);
    $this->order = Order::where('number', $this->orderNumber)->first();
});

function signedWebhook(object $test, array $data, ?string $signature = null)
{
    $signature ??= MyFatoorahGateway::sign($data, 'test-webhook-secret');

    return $test->postJson('/api/v1/payments/myfatoorah/webhook', webhookPayload($data), ['MyFatoorah-Signature' => $signature]);
}

// ---------------------------------------------------------------- create

it('creates a MyFatoorah v3 payment server-side and returns the hosted URL', function () {
    fakeMyFatoorah(['invoice' => 5001]);

    $response = $this->actingAs($this->user)
        ->postJson('/api/v1/payments/myfatoorah/create', ['order_number' => $this->orderNumber])
        ->assertOk()
        ->assertJsonPath('data.payment_url', 'https://demo.myfatoorah.com/pay/5001');

    // The API key never reaches the client.
    expect($response->getContent())->not->toContain('test-api-key');

    Http::assertSent(fn (HttpRequest $r) => $r->url() === MF.'/v3/payments'
        && $r->method() === 'POST'
        && $r->hasHeader('Authorization', 'Bearer test-api-key')
        && $r['PaymentMethod'] === 'CARD'
        && $r['Order']['Amount'] == 199
        && $r['Order']['Currency'] === 'SAR'
        && $r['IntegrationUrls']['Redirection'] === route('api.v1.payments.myfatoorah.callback'));

    $payment = Payment::sole();
    expect($payment->status)->toBe(PaymentStatus::Pending)
        ->and($payment->provider_invoice_id)->toBe('5001')
        ->and($payment->amount)->toBe(19900);
});

it('reuses an unfinished payment link instead of creating duplicates', function () {
    fakeMyFatoorah();

    $first = startPayment($this, $this->user, $this->orderNumber);
    $second = startPayment($this, $this->user, $this->orderNumber);

    expect($second)->toBe($first)->and(Payment::count())->toBe(1);
    Http::assertSentCount(1);
});

it('refuses to pay someone else\'s order, a paid order or without verification', function () {
    fakeMyFatoorah();

    $this->actingAs(buyer())->postJson('/api/v1/payments/myfatoorah/create', ['order_number' => $this->orderNumber])->assertForbidden();
    $this->actingAs(User::factory()->unverified()->create())->postJson('/api/v1/payments/myfatoorah/create', ['order_number' => $this->orderNumber])->assertForbidden();

    $this->order->forceFill(['status' => OrderStatus::Paid])->save();
    $this->actingAs($this->user)->postJson('/api/v1/payments/myfatoorah/create', ['order_number' => $this->orderNumber])
        ->assertStatus(409)
        ->assertJsonPath('code', 'order_not_payable');
});

it('reports gateway outages clearly and records the failed attempt', function () {
    Http::fake([MF.'/*' => Http::response(['IsSuccess' => false, 'Message' => 'Invalid token'], 401)]);

    $this->actingAs($this->user)->postJson('/api/v1/payments/myfatoorah/create', ['order_number' => $this->orderNumber])
        ->assertStatus(502)
        ->assertJsonPath('code', 'payment_gateway_unavailable');

    expect(Payment::sole()->status)->toBe(PaymentStatus::Failed);
});

// ---------------------------------------------------------------- callback

it('verifies the payment server-side on callback, fulfils the order and redirects to success', function () {
    fakeMyFatoorah(['invoice' => 5001, 'paymentId' => 'PAY-1']);
    startPayment($this, $this->user, $this->orderNumber);

    $this->get('/api/v1/payments/myfatoorah/callback?paymentId=PAY-1')
        ->assertRedirect("http://localhost:5173/payment/success?order={$this->orderNumber}");

    Http::assertSent(fn (HttpRequest $r) => $r->method() === 'GET' && $r->url() === MF.'/v3/payments/PAY-1');

    $order = $this->order->fresh();
    expect($order->status)->toBe(OrderStatus::Paid)
        ->and($order->paid_at)->not->toBeNull()
        ->and($order->payments()->first()->status)->toBe(PaymentStatus::Paid)
        ->and($order->payments()->first()->provider_payment_id)->toBe('PAY-1');

    $enrollment = Enrollment::where('user_id', $this->user->id)->where('course_id', $this->course->id)->sole();
    expect($enrollment->status)->toBe(EnrollmentStatus::Active)
        ->and($enrollment->expires_at->diffInDays(now()->addDays(90), true))->toBeLessThan(1)
        ->and($enrollment->order_id)->toBe($order->id);

    $invoice = Invoice::sole();
    expect($invoice->number)->toMatch('/^INV-\d{4}-\d{6}$/')
        ->and($invoice->total_amount)->toBe(19900)
        ->and($invoice->tax_amount)->toBe(19900 - (int) round(19900 * 100 / 115));

    Notification::assertSentTo($this->user, OrderPaidNotification::class);
});

it('is idempotent when the customer reloads the callback', function () {
    fakeMyFatoorah(['paymentId' => 'PAY-1']);
    startPayment($this, $this->user, $this->orderNumber);

    $this->get('/api/v1/payments/myfatoorah/callback?paymentId=PAY-1')->assertRedirect();
    $this->get('/api/v1/payments/myfatoorah/callback?paymentId=PAY-1')->assertRedirect();

    expect(Enrollment::count())->toBe(1)->and(Invoice::count())->toBe(1);
    Notification::assertSentToTimes($this->user, OrderPaidNotification::class, 1);
});

it('marks failed payments and lets the customer retry', function () {
    fakeMyFatoorah(['paymentId' => 'PAY-F', 'invoiceStatus' => 'PENDING', 'transactionStatus' => 'FAILED']);
    startPayment($this, $this->user, $this->orderNumber);

    $this->get('/api/v1/payments/myfatoorah/callback?paymentId=PAY-F')
        ->assertRedirect("http://localhost:5173/payment/failed?order={$this->orderNumber}");

    expect($this->order->fresh()->status)->toBe(OrderStatus::Failed)->and(Enrollment::count())->toBe(0);

    // Retry creates a new payment and re-opens the order.
    fakeMyFatoorah(['invoice' => 5002, 'paymentId' => 'PAY-2']);
    startPayment($this, $this->user, $this->orderNumber);
    expect($this->order->fresh()->status)->toBe(OrderStatus::Pending)->and(Payment::count())->toBe(2);

    $this->get('/api/v1/payments/myfatoorah/callback?paymentId=PAY-2')->assertRedirect("http://localhost:5173/payment/success?order={$this->orderNumber}");
    expect($this->order->fresh()->status)->toBe(OrderStatus::Paid);
});

it('ignores callbacks for payments that are not ours', function () {
    fakeMyFatoorah(['invoice' => 9999, 'paymentId' => 'FOREIGN']);

    $this->get('/api/v1/payments/myfatoorah/callback?paymentId=FOREIGN')
        ->assertRedirect('http://localhost:5173/payment/failed?reason=unknown_payment');
    $this->get('/api/v1/payments/myfatoorah/callback')->assertRedirect('http://localhost:5173/payment/failed?reason=invalid_callback');

    expect($this->order->fresh()->status)->toBe(OrderStatus::Pending);
});

it('never marks an order paid when the verified amount does not match', function () {
    fakeMyFatoorah(['paymentId' => 'PAY-X', 'amount' => 1.0]);
    startPayment($this, $this->user, $this->orderNumber);
    $admin = User::factory()->admin()->create();

    $this->get('/api/v1/payments/myfatoorah/callback?paymentId=PAY-X')->assertRedirect("http://localhost:5173/payment/failed?order={$this->orderNumber}");

    expect($this->order->fresh()->status)->not->toBe(OrderStatus::Paid)
        ->and(Payment::sole()->failure_reason)->toBe('amount_mismatch')
        ->and(Enrollment::count())->toBe(0);
    Notification::assertSentTo($admin, PaymentNeedsReviewNotification::class);
});

it('rejects a currency mismatch', function () {
    fakeMyFatoorah(['paymentId' => 'PAY-C', 'currency' => 'KWD']);
    startPayment($this, $this->user, $this->orderNumber);

    $this->get('/api/v1/payments/myfatoorah/callback?paymentId=PAY-C');

    expect($this->order->fresh()->status)->not->toBe(OrderStatus::Paid);
});

it('flags a second successful payment as a duplicate without fulfilling twice', function () {
    // First payment link + success.
    fakeMyFatoorah(['invoice' => 5001, 'paymentId' => 'PAY-1']);
    startPayment($this, $this->user, $this->orderNumber);
    $this->get('/api/v1/payments/myfatoorah/callback?paymentId=PAY-1');

    // A second invoice for the same order is also paid (e.g. two tabs).
    $this->order->payments()->create(['provider' => 'myfatoorah', 'status' => 'pending', 'amount' => 19900, 'currency' => 'SAR', 'provider_invoice_id' => '5002', 'payment_url' => 'https://x']);
    $admin = User::factory()->admin()->create();
    fakeMyFatoorah(['invoice' => 5002, 'paymentId' => 'PAY-2']);
    $this->get('/api/v1/payments/myfatoorah/callback?paymentId=PAY-2');

    $duplicate = Payment::where('provider_invoice_id', '5002')->first();
    expect($duplicate->status)->toBe(PaymentStatus::Paid)
        ->and($duplicate->is_duplicate)->toBeTrue()
        ->and(Enrollment::count())->toBe(1)
        ->and(Invoice::count())->toBe(1);
    Notification::assertSentTo($admin, PaymentNeedsReviewNotification::class);
});

// ---------------------------------------------------------------- webhook

it('processes a signed webhook by re-verifying with MyFatoorah', function () {
    fakeMyFatoorah(['invoice' => 5001, 'paymentId' => 'PAY-W']);
    startPayment($this, $this->user, $this->orderNumber);

    signedWebhook($this, paidWebhookData(5001, 'PAY-W'))->assertOk()->assertJsonPath('received', true);

    expect($this->order->fresh()->status)->toBe(OrderStatus::Paid)
        ->and(PaymentWebhookEvent::sole()->status)->toBe('processed')
        ->and(PaymentWebhookEvent::sole()->signature_valid)->toBeTrue();
    Http::assertSent(fn (HttpRequest $r) => $r->url() === MF.'/v3/payments/PAY-W');
});

it('processes duplicate webhook deliveries only once', function () {
    fakeMyFatoorah(['paymentId' => 'PAY-W']);
    startPayment($this, $this->user, $this->orderNumber);

    signedWebhook($this, paidWebhookData(5001, 'PAY-W'))->assertOk();
    signedWebhook($this, paidWebhookData(5001, 'PAY-W'))->assertOk()->assertJsonPath('duplicate', true);
    signedWebhook($this, paidWebhookData(5001, 'PAY-W'))->assertOk()->assertJsonPath('duplicate', true);

    expect(PaymentWebhookEvent::count())->toBe(1)
        ->and(Enrollment::count())->toBe(1)
        ->and(Invoice::count())->toBe(1);
    Notification::assertSentToTimes($this->user, OrderPaidNotification::class, 1);
});

it('rejects webhooks with an invalid or missing signature', function () {
    fakeMyFatoorah(['paymentId' => 'PAY-W']);
    startPayment($this, $this->user, $this->orderNumber);

    signedWebhook($this, paidWebhookData(5001, 'PAY-W'), 'forged-signature')->assertUnauthorized()->assertJsonPath('code', 'invalid_signature');
    $this->postJson('/api/v1/payments/myfatoorah/webhook', webhookPayload(paidWebhookData(5001, 'PAY-W')))->assertUnauthorized();

    // Signed with the wrong secret.
    signedWebhook($this, paidWebhookData(5001, 'PAY-W'), MyFatoorahGateway::sign(paidWebhookData(5001, 'PAY-W'), 'other-secret'))->assertUnauthorized();

    // Forged requests are not stored, so they cannot claim the event key.
    expect($this->order->fresh()->status)->toBe(OrderStatus::Pending)
        ->and(PaymentWebhookEvent::count())->toBe(0);
    Http::assertNotSent(fn (HttpRequest $r) => str_contains($r->url(), '/v3/payments/PAY-W'));

    // The genuine delivery is still processed, and a forged replay of it
    // is rejected rather than reported as a duplicate.
    signedWebhook($this, paidWebhookData(5001, 'PAY-W'))->assertOk()->assertJsonMissingPath('duplicate');
    signedWebhook($this, paidWebhookData(5001, 'PAY-W'), 'forged-signature')->assertUnauthorized();
    expect($this->order->fresh()->status)->toBe(OrderStatus::Paid);
});

it('fails closed when no webhook secret is configured', function () {
    config(['services.myfatoorah.webhook_secret' => null]);
    fakeMyFatoorah(['paymentId' => 'PAY-W']);

    signedWebhook($this, paidWebhookData(5001, 'PAY-W'), MyFatoorahGateway::sign(paidWebhookData(5001, 'PAY-W'), ''))->assertUnauthorized();
});

it('does not trust the webhook payload status', function () {
    // The (validly signed) webhook claims PAID, but MyFatoorah reports pending.
    fakeMyFatoorah(['paymentId' => 'PAY-W', 'invoiceStatus' => 'PENDING', 'transactionStatus' => 'INPROGRESS']);
    startPayment($this, $this->user, $this->orderNumber);

    signedWebhook($this, paidWebhookData(5001, 'PAY-W'))->assertOk();

    expect($this->order->fresh()->status)->toBe(OrderStatus::Pending)->and(Enrollment::count())->toBe(0);
});

it('ignores webhooks for unknown payments and unrelated events', function () {
    fakeMyFatoorah(['invoice' => 7777, 'paymentId' => 'OTHER']);

    signedWebhook($this, paidWebhookData(7777, 'OTHER'))->assertOk();
    expect(PaymentWebhookEvent::sole()->status)->toBe('ignored');

    $this->postJson('/api/v1/payments/myfatoorah/webhook', ['Event' => ['Code' => 2, 'Name' => 'REFUND_STATUS_CHANGED'], 'Data' => []])
        ->assertOk()
        ->assertJsonPath('ignored', true);
});

it('asks MyFatoorah to retry when verification is temporarily impossible', function () {
    fakeMyFatoorah(['paymentId' => 'PAY-W']);
    startPayment($this, $this->user, $this->orderNumber);
    fakeMyFatoorah(['paymentId' => 'PAY-W', 'down' => true]);

    signedWebhook($this, paidWebhookData(5001, 'PAY-W'))->assertStatus(503);
    expect(PaymentWebhookEvent::sole()->status)->toBe('failed');

    // The retry succeeds once MyFatoorah is reachable again.
    fakeMyFatoorah(['paymentId' => 'PAY-W']);
    signedWebhook($this, paidWebhookData(5001, 'PAY-W'))->assertOk();
    expect($this->order->fresh()->status)->toBe(OrderStatus::Paid);
});

// ---------------------------------------------------------------- enrollments & refunds

it('extends an active enrollment when the course is bought again', function () {
    fakeMyFatoorah(['paymentId' => 'PAY-1']);
    startPayment($this, $this->user, $this->orderNumber);
    $this->get('/api/v1/payments/myfatoorah/callback?paymentId=PAY-1');
    $firstExpiry = Enrollment::sole()->expires_at;

    // Second purchase of the same 90-day plan.
    addToCart($this, $this->user, 'course_plan', $this->plan->id);
    $second = placeOrder($this, $this->user);
    fakeMyFatoorah(['invoice' => 6001, 'paymentId' => 'PAY-2']);
    startPayment($this, $this->user, $second);
    $this->get('/api/v1/payments/myfatoorah/callback?paymentId=PAY-2');

    $enrollment = Enrollment::sole(); // still exactly one row
    expect($enrollment->expires_at->diffInDays($firstExpiry->copy()->addDays(90), true))->toBeLessThan(1);
});

it('grants product entitlements and exposes enrollments to the student', function () {
    $product = Product::factory()->create(['price_amount' => 4900]);
    addToCart($this, $this->user, 'product', $product->id);
    $number = placeOrder($this, $this->user);
    fakeMyFatoorah(['invoice' => 6100, 'paymentId' => 'PAY-P', 'amount' => 49.0]);
    startPayment($this, $this->user, $number);
    $this->get('/api/v1/payments/myfatoorah/callback?paymentId=PAY-P');

    expect(ProductEntitlement::where('user_id', $this->user->id)->where('product_id', $product->id)->exists())->toBeTrue();

    $this->actingAs($this->user)->postJson('/api/v1/cart/items', ['type' => 'product', 'id' => $product->id])
        ->assertJsonPath('code', 'already_owned');
});

it('expires enrollments on schedule', function () {
    fakeMyFatoorah(['paymentId' => 'PAY-1']);
    startPayment($this, $this->user, $this->orderNumber);
    $this->get('/api/v1/payments/myfatoorah/callback?paymentId=PAY-1');

    $this->actingAs($this->user)->getJson('/api/v1/enrollments')->assertJsonPath('data.0.is_active', true);

    $this->travel(91)->days();
    $this->artisan('enrollments:expire')->assertSuccessful();

    expect(Enrollment::sole()->status)->toBe(EnrollmentStatus::Expired);
    $this->actingAs($this->user)->getJson('/api/v1/enrollments')->assertJsonPath('data.0.is_active', false);
});

it('lets admins record a refund, which revokes access', function () {
    fakeMyFatoorah(['paymentId' => 'PAY-1']);
    startPayment($this, $this->user, $this->orderNumber);
    $this->get('/api/v1/payments/myfatoorah/callback?paymentId=PAY-1');
    $admin = User::factory()->admin()->create();

    $this->actingAs($this->user)->postJson("/api/v1/admin/orders/{$this->orderNumber}/refund", ['reason' => 'x'])->assertForbidden();

    $this->actingAs($admin)
        ->postJson("/api/v1/admin/orders/{$this->orderNumber}/refund", ['reason' => 'طلب العميل خلال فترة الاسترجاع'])
        ->assertOk()
        ->assertJsonPath('data.status.value', 'refunded');

    expect(Enrollment::sole()->status)->toBe(EnrollmentStatus::Revoked)
        ->and(Payment::sole()->status)->toBe(PaymentStatus::Refunded);

    $this->actingAs($admin)->postJson("/api/v1/admin/orders/{$this->orderNumber}/refund", ['reason' => 'again'])->assertStatus(409);
});

it('reconciles then cancels stale unpaid orders', function () {
    fakeMyFatoorah(['paymentId' => 'PAY-LATE']);
    startPayment($this, $this->user, $this->orderNumber);
    // The customer paid but never returned and the webhook was lost.
    Payment::sole()->forceFill(['provider_payment_id' => 'PAY-LATE'])->save();

    addToCart($this, $this->user, 'course_plan', courseWithPlans()->plans()->first()->id);
    $abandoned = placeOrder($this, $this->user);

    $this->travel(25)->hours();
    $this->artisan('orders:cancel-stale')->assertSuccessful();

    expect($this->order->fresh()->status)->toBe(OrderStatus::Paid)
        ->and(Order::where('number', $abandoned)->first()->status)->toBe(OrderStatus::Cancelled);
});

it('shows invoices only to their owner', function () {
    fakeMyFatoorah(['paymentId' => 'PAY-1']);
    startPayment($this, $this->user, $this->orderNumber);
    $this->get('/api/v1/payments/myfatoorah/callback?paymentId=PAY-1');
    $number = Invoice::sole()->number;

    $this->actingAs($this->user)->getJson("/api/v1/invoices/{$number}")->assertOk()->assertJsonPath('data.total.amount_minor', 19900);
    $this->actingAs(buyer())->getJson("/api/v1/invoices/{$number}")->assertForbidden();
});
