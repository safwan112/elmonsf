<?php

namespace App\Payments\MyFatoorah;

use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Payments\Contracts\PaymentGateway;
use App\Payments\Data\GatewayCheckout;
use App\Payments\Data\GatewayPayment;
use App\Payments\Data\WebhookNotification;
use App\Payments\PaymentGatewayException;
use App\Support\Money;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * MyFatoorah API v3 (hosted payment page).
 *
 *  - POST /v3/payments           create a payment → InvoiceId + PaymentURL
 *  - GET  /v3/payments/{id}      authoritative status (Invoice / Transaction)
 *  - Webhook V2 PAYMENT_STATUS_CHANGED, signed with HMAC-SHA256 in the
 *    MyFatoorah-Signature header.
 *
 * The API key never leaves the server. All response-shape knowledge is kept
 * in this class.
 */
class MyFatoorahGateway implements PaymentGateway
{
    public const NAME = 'myfatoorah';

    /** Fields signed for PAYMENT_STATUS_CHANGED, in order. */
    private const SIGNED_FIELDS = [
        'Invoice.Id',
        'Invoice.Status',
        'Transaction.Status',
        'Transaction.PaymentId',
        'Invoice.ExternalIdentifier',
    ];

    public function name(): string
    {
        return self::NAME;
    }

    public function createPayment(Order $order, Payment $payment, string $returnUrl): GatewayCheckout
    {
        $payload = [
            'PaymentMethod' => config('services.myfatoorah.payment_method', 'CARD'),
            'Order' => [
                'Amount' => Money::toMajor($payment->amount),
                'Currency' => $payment->currency,
            ],
            'IntegrationUrls' => [
                'Redirection' => $returnUrl,
            ],
        ];

        $body = $this->decode($this->send(fn (PendingRequest $http) => $http->post('/v3/payments', $payload)), 'create');
        $data = Payload::unwrap($body);

        $invoiceId = Payload::get($data, ['InvoiceId', 'Invoice.Id']);
        $url = Payload::get($data, ['PaymentURL', 'PaymentUrl', 'Invoice.PaymentURL']);

        if (! $invoiceId || ! is_string($url) || (! str_starts_with($url, 'https://') && ! $this->allowsInsecureUrls())) {
            throw new PaymentGatewayException('MyFatoorah create payment: missing InvoiceId or PaymentURL.', ['body' => $body]);
        }

        return new GatewayCheckout((string) $invoiceId, $url, $body);
    }

    public function fetchPayment(string $providerPaymentId): GatewayPayment
    {
        $body = $this->decode(
            $this->send(fn (PendingRequest $http) => $http->retry(2, 300, throw: false)->get('/v3/payments/'.rawurlencode($providerPaymentId))),
            'fetch',
        );
        $data = Payload::unwrap($body);

        $invoiceStatus = strtoupper((string) Payload::get($data, ['Invoice.Status', 'InvoiceStatus']));
        $transactionStatus = strtoupper((string) Payload::get($data, ['Transaction.Status', 'TransactionStatus']));

        $status = match (true) {
            $invoiceStatus === 'PAID' || $transactionStatus === 'SUCCESS' => PaymentStatus::Paid,
            $transactionStatus === 'FAILED' => PaymentStatus::Failed,
            in_array($transactionStatus, ['CANCELED', 'CANCELLED'], true) || in_array($invoiceStatus, ['CANCELED', 'CANCELLED', 'EXPIRED'], true) => PaymentStatus::Cancelled,
            default => PaymentStatus::Pending,
        };

        $amount = Payload::get($data, ['Invoice.Value', 'Invoice.InvoiceValue', 'Invoice.Amount', 'Order.Amount', 'Transaction.Amount', 'InvoiceValue', 'Amount']);
        $currency = Payload::get($data, ['Invoice.Currency', 'Order.Currency', 'Transaction.Currency', 'Currency']);

        return new GatewayPayment(
            paymentId: (string) (Payload::get($data, ['Transaction.PaymentId', 'PaymentId']) ?? $providerPaymentId),
            invoiceId: ($id = Payload::get($data, ['Invoice.Id', 'InvoiceId'])) !== null ? (string) $id : null,
            status: $status,
            amountMinor: is_numeric($amount) ? Money::toMinor($amount) : null,
            currency: is_string($currency) ? strtoupper($currency) : null,
            failureReason: ($reason = Payload::get($data, ['Transaction.Error.Message', 'Transaction.ErrorMessage', 'Transaction.Error'])) && is_string($reason) ? $reason : null,
            raw: $body,
        );
    }

    public function parseWebhook(Request $request): WebhookNotification
    {
        /** @var array<string, mixed> $payload */
        $payload = $request->json()->all();
        $eventName = strtoupper((string) (Payload::get($payload, ['Event.Name', 'EventType', 'Event']) ?? ''));
        $data = Payload::unwrap($payload);

        $actionable = in_array($eventName, ['PAYMENT_STATUS_CHANGED', '1', 'TRANSACTIONSSTATUSCHANGED'], true);
        $invoiceId = Payload::get($data, ['Invoice.Id', 'InvoiceId']);
        $paymentId = Payload::get($data, ['Transaction.PaymentId', 'PaymentId']);

        $keyParts = [
            $eventName,
            $invoiceId,
            Payload::get($data, ['Transaction.Id', 'TransactionId']),
            $paymentId,
            Payload::get($data, ['Transaction.Status', 'TransactionStatus']),
            Payload::get($data, ['Invoice.Status', 'InvoiceStatus']),
        ];

        return new WebhookNotification(
            idempotencyKey: hash('sha256', implode('|', array_map(fn ($v) => (string) $v, $keyParts))),
            eventType: $eventName ?: null,
            signatureValid: $actionable && $this->signatureMatches($data, (string) $request->header('MyFatoorah-Signature')),
            actionable: $actionable,
            invoiceId: $invoiceId !== null ? (string) $invoiceId : null,
            paymentId: $paymentId !== null ? (string) $paymentId : null,
            payload: $payload,
        );
    }

    /**
     * base64(HMAC-SHA256(secret, "Invoice.Id=…,Invoice.Status=…,…")), with
     * null values as empty strings. Fails closed without a configured secret.
     *
     * @param  array<string, mixed>  $data
     */
    public function signatureMatches(array $data, string $signature): bool
    {
        $secret = (string) config('services.myfatoorah.webhook_secret');
        if ($secret === '' || $signature === '') {
            return false;
        }

        return hash_equals(self::sign($data, $secret), $signature);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public static function sign(array $data, string $secret): string
    {
        $pairs = array_map(function (string $field) use ($data) {
            $value = Payload::get($data, $field);

            return $field.'='.(is_scalar($value) ? (is_bool($value) ? ($value ? 'true' : 'false') : (string) $value) : '');
        }, self::SIGNED_FIELDS);

        return base64_encode(hash_hmac('sha256', implode(',', $pairs), $secret, true));
    }

    private function send(callable $call): Response
    {
        $key = (string) config('services.myfatoorah.api_key');
        if ($key === '') {
            throw new PaymentGatewayException('MyFatoorah API key is not configured.');
        }

        $http = Http::baseUrl((string) config('services.myfatoorah.base_url'))
            ->withToken($key)
            ->acceptJson()
            ->asJson()
            ->timeout((int) config('services.myfatoorah.timeout', 20))
            ->connectTimeout(10);

        try {
            return $call($http);
        } catch (ConnectionException $e) {
            throw new PaymentGatewayException('Could not reach MyFatoorah.', [], $e);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function decode(Response $response, string $operation): array
    {
        $body = $response->json();

        if (! $response->successful() || ! is_array($body) || Payload::get($body, 'IsSuccess') === false) {
            Log::warning("myfatoorah.{$operation}_failed", [
                'status' => $response->status(),
                // Error bodies contain no card data; keep them for support.
                'message' => is_array($body) ? Payload::get($body, ['Message', 'ValidationErrors']) : null,
            ]);

            throw new PaymentGatewayException("MyFatoorah {$operation} failed (HTTP {$response->status()}).", [
                'status' => $response->status(),
                'body' => is_array($body) ? $body : null,
            ]);
        }

        return $body;
    }

    /** Local simulator runs over plain HTTP. */
    private function allowsInsecureUrls(): bool
    {
        return (bool) config('services.myfatoorah.simulator') && ! app()->isProduction();
    }
}
