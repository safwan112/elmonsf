<?php

use App\Models\Course;
use App\Models\User;
use Illuminate\Support\Facades\Http;

const MF = 'https://apitest.myfatoorah.com';

function buyer(): User
{
    return User::factory()->student()->create();
}

/** Published course with a 199 SAR / 90-day plan and a 299 SAR / 180-day plan. */
function courseWithPlans(): Course
{
    return Course::factory()->withPlans([19900, 29900])->create();
}

function addToCart(object $test, User $user, string $type, int $id): void
{
    $test->actingAs($user)->postJson('/api/v1/cart/items', ['type' => $type, 'id' => $id])->assertCreated();
}

function placeOrder(object $test, User $user): string
{
    return $test->actingAs($user)
        ->postJson('/api/v1/checkout', ['accept_terms' => true])
        ->assertCreated()
        ->json('data.number');
}

/**
 * Fake the MyFatoorah v3 API. Http::fake() stubs stack (the first match
 * wins), so the stubs read the *current* scenario from a shared variable and
 * calling this again simply switches the scenario.
 *
 * @param  array{invoice?: int, paymentId?: string, invoiceStatus?: string, transactionStatus?: string, amount?: float, currency?: string, down?: bool}  $o
 */
function fakeMyFatoorah(array $o = []): void
{
    $GLOBALS['mf_scenario'] = $o;

    if ($GLOBALS['mf_faked'] ?? false) {
        return;
    }
    $GLOBALS['mf_faked'] = true;

    Http::fake([
        MF.'/v3/payments' => function () {
            $o = $GLOBALS['mf_scenario'];
            $invoice = $o['invoice'] ?? 5001;

            return Http::response([
                'IsSuccess' => true,
                'Data' => ['InvoiceId' => $invoice, 'PaymentId' => null, 'PaymentURL' => "https://demo.myfatoorah.com/pay/{$invoice}"],
            ]);
        },
        MF.'/v3/payments/*' => function () {
            $o = $GLOBALS['mf_scenario'];
            if ($o['down'] ?? false) {
                return Http::response('Service Unavailable', 503);
            }

            return Http::response([
                'IsSuccess' => true,
                'Data' => [
                    'Invoice' => ['Id' => $o['invoice'] ?? 5001, 'Status' => $o['invoiceStatus'] ?? 'PAID', 'Value' => $o['amount'] ?? 199.0, 'Currency' => $o['currency'] ?? 'SAR', 'ExternalIdentifier' => null],
                    'Transaction' => ['Id' => 'T1', 'Status' => $o['transactionStatus'] ?? 'SUCCESS', 'PaymentId' => $o['paymentId'] ?? '0708500112345'],
                ],
            ]);
        },
    ]);
}

/** Start the hosted payment for an order and return its payment URL. */
function startPayment(object $test, User $user, string $orderNumber): string
{
    return $test->actingAs($user)
        ->postJson('/api/v1/payments/myfatoorah/create', ['order_number' => $orderNumber])
        ->assertOk()
        ->json('data.payment_url');
}

/**
 * @param  array<string, mixed>  $data
 * @return array<string, mixed>
 */
function webhookPayload(array $data): array
{
    return ['Event' => ['Code' => 1, 'Name' => 'PAYMENT_STATUS_CHANGED', 'Reference' => 'WH-1'], 'Data' => $data];
}

/**
 * @return array<string, mixed>
 */
function paidWebhookData(int $invoice = 5001, string $paymentId = '0708500112345', string $status = 'PAID'): array
{
    return [
        'Invoice' => ['Id' => $invoice, 'Status' => $status, 'ExternalIdentifier' => null],
        'Transaction' => ['Id' => 'T1', 'Status' => $status === 'PAID' ? 'SUCCESS' : 'FAILED', 'PaymentId' => $paymentId],
    ];
}
