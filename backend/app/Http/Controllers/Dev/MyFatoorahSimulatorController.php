<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use App\Payments\MyFatoorah\MyFatoorahGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\View\View;

/**
 * LOCAL SANDBOX ONLY — a stand-in for MyFatoorah's hosted payment flow so the
 * real MyFatoorahGateway, callback and webhook code can run without network
 * access (development, demos, E2E). Registered only when
 * MYFATOORAH_SIMULATOR=true and the app is not in production.
 */
class MyFatoorahSimulatorController extends Controller
{
    private const TTL = 86400;

    public function createPayment(Request $request): JsonResponse
    {
        if ($denied = $this->checkToken($request)) {
            return $denied;
        }

        $amount = $request->input('Order.Amount');
        $redirect = (string) $request->input('IntegrationUrls.Redirection');
        if (! is_numeric($amount) || $redirect === '') {
            return response()->json(['IsSuccess' => false, 'Message' => 'Validation error', 'ValidationErrors' => [['Name' => 'Order.Amount']]], 400);
        }

        $invoiceId = (string) random_int(1_000_000, 9_999_999);
        Cache::put("mf-sim:invoice:{$invoiceId}", [
            'amount' => (float) $amount,
            'currency' => (string) ($request->input('Order.Currency') ?? 'SAR'),
            'redirect' => $redirect,
            'status' => 'PENDING',
            'transaction_status' => 'INPROGRESS',
            'payment_id' => null,
        ], self::TTL);

        return response()->json([
            'IsSuccess' => true,
            'Message' => '',
            'Data' => [
                'InvoiceId' => (int) $invoiceId,
                'PaymentId' => null,
                'PaymentURL' => url("/__myfatoorah-sim/pay/{$invoiceId}"),
            ],
        ]);
    }

    public function showPaymentPage(string $invoiceId): View
    {
        $invoice = Cache::get("mf-sim:invoice:{$invoiceId}");
        abort_unless($invoice, 404);

        return view('dev.myfatoorah-simulator', ['invoiceId' => $invoiceId, 'invoice' => $invoice]);
    }

    public function pay(Request $request, string $invoiceId): RedirectResponse
    {
        $invoice = Cache::get("mf-sim:invoice:{$invoiceId}");
        abort_unless($invoice, 404);

        $outcome = $request->input('outcome');
        [$invoiceStatus, $transactionStatus] = match ($outcome) {
            'success' => ['PAID', 'SUCCESS'],
            'cancel' => ['PENDING', 'CANCELED'],
            default => ['PENDING', 'FAILED'],
        };

        $paymentId = (string) random_int(10_000_000, 99_999_999).$invoiceId;
        $invoice = [...$invoice, 'status' => $invoiceStatus, 'transaction_status' => $transactionStatus, 'payment_id' => $paymentId];
        Cache::put("mf-sim:invoice:{$invoiceId}", $invoice, self::TTL);
        Cache::put("mf-sim:payment:{$paymentId}", $invoiceId, self::TTL);

        $separator = str_contains($invoice['redirect'], '?') ? '&' : '?';

        return redirect()->away($invoice['redirect'].$separator.'paymentId='.$paymentId);
    }

    public function getPayment(Request $request, string $paymentId): JsonResponse
    {
        if ($denied = $this->checkToken($request)) {
            return $denied;
        }

        $invoiceId = Cache::get("mf-sim:payment:{$paymentId}");
        $invoice = $invoiceId ? Cache::get("mf-sim:invoice:{$invoiceId}") : null;
        if (! $invoice) {
            return response()->json(['IsSuccess' => false, 'Message' => 'Payment not found'], 404);
        }

        return response()->json(['IsSuccess' => true, 'Data' => $this->paymentData($invoiceId, $invoice)]);
    }

    /**
     * Test helper: the signed PAYMENT_STATUS_CHANGED webhook MyFatoorah would
     * send for a payment.
     */
    public function webhookPayload(string $paymentId): JsonResponse
    {
        $invoiceId = Cache::get("mf-sim:payment:{$paymentId}");
        $invoice = $invoiceId ? Cache::get("mf-sim:invoice:{$invoiceId}") : null;
        abort_unless($invoice, 404);

        $data = $this->paymentData($invoiceId, $invoice);
        $payload = [
            'Event' => ['Code' => 1, 'Name' => 'PAYMENT_STATUS_CHANGED', 'CountryIsoCode' => 'SAU', 'CreationDate' => now()->toIso8601String(), 'Reference' => 'WH-'.$paymentId],
            'Data' => $data,
        ];

        return response()->json([
            'payload' => $payload,
            'signature' => MyFatoorahGateway::sign($data, (string) config('services.myfatoorah.webhook_secret')),
        ]);
    }

    /**
     * @param  array<string, mixed>  $invoice
     * @return array<string, mixed>
     */
    private function paymentData(string $invoiceId, array $invoice): array
    {
        return [
            'Invoice' => [
                'Id' => (int) $invoiceId,
                'Status' => $invoice['status'],
                'Value' => $invoice['amount'],
                'Currency' => $invoice['currency'],
                'ExternalIdentifier' => null,
            ],
            'Transaction' => [
                'Id' => $invoice['payment_id'] ? 'T'.$invoice['payment_id'] : null,
                'Status' => $invoice['transaction_status'],
                'PaymentId' => $invoice['payment_id'],
                'Error' => $invoice['transaction_status'] === 'FAILED' ? ['Message' => 'Card declined (simulated)'] : null,
            ],
        ];
    }

    private function checkToken(Request $request): ?JsonResponse
    {
        $expected = (string) config('services.myfatoorah.api_key');
        if ($expected === '' || ! hash_equals($expected, (string) $request->bearerToken())) {
            return response()->json(['IsSuccess' => false, 'Message' => 'Unauthorized'], 401);
        }

        return null;
    }
}
