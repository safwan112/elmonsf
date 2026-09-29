<?php

namespace App\Http\Controllers\Api\V1\Commerce;

use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\PaymentWebhookEvent;
use App\Payments\MyFatoorah\MyFatoorahGateway;
use App\Payments\PaymentGatewayException;
use App\Services\Payments\PaymentProcessor;
use App\Services\Payments\PaymentService;
use App\Services\Payments\PaymentVerificationException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * MyFatoorah payment endpoints:
 *  - create:   start a hosted payment for one of the user's orders
 *  - callback: customer returns from the hosted page (?paymentId=…)
 *  - webhook:  server-to-server status notification (signed)
 *
 * Neither callback nor webhook trust their input: both re-fetch the payment
 * from MyFatoorah and go through PaymentProcessor.
 */
class MyFatoorahController extends Controller
{
    public function __construct(
        private readonly PaymentService $payments,
        private readonly PaymentProcessor $processor,
        private readonly MyFatoorahGateway $gateway,
    ) {}

    public function create(Request $request): JsonResponse
    {
        $data = $request->validate(['order_number' => ['required', 'string', 'max:32']]);
        $order = Order::query()->where('number', $data['order_number'])->firstOrFail();
        Gate::authorize('pay', $order);

        $payment = $this->payments->start($order, MyFatoorahGateway::NAME);

        return response()->json([
            'data' => [
                'order_number' => $order->number,
                'payment_url' => $payment->payment_url,
            ],
        ]);
    }

    public function callback(Request $request): RedirectResponse
    {
        $paymentId = (string) ($request->query('paymentId') ?? $request->query('PaymentId') ?? '');
        $frontend = config('platform.frontend_url');

        if ($paymentId === '' || strlen($paymentId) > 100) {
            return redirect()->away("{$frontend}/payment/failed?reason=invalid_callback");
        }

        try {
            $payment = $this->processor->syncByProviderPaymentId(MyFatoorahGateway::NAME, $paymentId);
        } catch (PaymentVerificationException) {
            return redirect()->away("{$frontend}/payment/failed?reason=unknown_payment");
        } catch (PaymentGatewayException $e) {
            report($e);

            // We could not confirm yet; the webhook/reconciliation will. Show a
            // "processing" state rather than a false failure.
            return redirect()->away("{$frontend}/payment/success?pending=1");
        }

        $order = $payment->order()->first(['number']);
        $query = http_build_query(['order' => $order->number]);

        return match ($payment->status) {
            PaymentStatus::Paid => redirect()->away("{$frontend}/payment/success?{$query}"),
            PaymentStatus::Pending => redirect()->away("{$frontend}/payment/success?{$query}&pending=1"),
            default => redirect()->away("{$frontend}/payment/failed?{$query}"),
        };
    }

    public function webhook(Request $request): JsonResponse
    {
        $notification = $this->gateway->parseWebhook($request);

        // Authenticate before touching the idempotency store, so forged
        // requests can neither claim an event key nor learn whether it exists.
        if ($notification->actionable && ! $notification->signatureValid) {
            Log::warning('payments.webhook_invalid_signature', ['ip' => $request->ip(), 'invoice' => $notification->invoiceId]);

            return response()->json(['message' => __('api.forbidden'), 'code' => 'invalid_signature'], 401);
        }

        try {
            $event = PaymentWebhookEvent::query()->firstOrCreate(
                ['provider' => MyFatoorahGateway::NAME, 'idempotency_key' => $notification->idempotencyKey],
                [
                    'event_type' => $notification->eventType,
                    'provider_invoice_id' => $notification->invoiceId,
                    'provider_payment_id' => $notification->paymentId,
                    'signature_valid' => $notification->signatureValid,
                    'payload' => $notification->payload,
                    'ip_address' => $request->ip(),
                ],
            );
        } catch (UniqueConstraintViolationException) {
            // Concurrent delivery of the same event: the other request handles it.
            return response()->json(['received' => true, 'duplicate' => true]);
        }

        if (! $event->wasRecentlyCreated && $event->status === 'processed') {
            return response()->json(['received' => true, 'duplicate' => true]);
        }

        if (! $notification->actionable) {
            $event->forceFill(['status' => 'ignored', 'processed_at' => now()])->save();

            return response()->json(['received' => true, 'ignored' => true]);
        }

        if (! $notification->paymentId) {
            $event->forceFill(['status' => 'ignored', 'error' => 'missing_payment_id', 'processed_at' => now()])->save();

            return response()->json(['received' => true, 'ignored' => true]);
        }

        try {
            $this->processor->syncByProviderPaymentId(MyFatoorahGateway::NAME, $notification->paymentId);
            $event->forceFill(['status' => 'processed', 'processed_at' => now(), 'error' => null])->save();
        } catch (PaymentVerificationException $e) {
            $event->forceFill(['status' => 'ignored', 'error' => 'unknown_payment', 'processed_at' => now()])->save();
        } catch (Throwable $e) {
            report($e);
            $event->forceFill(['status' => 'failed', 'error' => mb_substr($e->getMessage(), 0, 500)])->save();

            // Non-2xx makes MyFatoorah retry later.
            return response()->json(['message' => 'retry later', 'code' => 'processing_failed'], 503);
        }

        return response()->json(['received' => true]);
    }
}
