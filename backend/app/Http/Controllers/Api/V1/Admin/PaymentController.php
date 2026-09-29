<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\PaymentStatus;
use App\Http\Controllers\Api\V1\Admin\Concerns\AdminCrud;
use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\PaymentWebhookEvent;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Read-only payment log: gateway attempts and received webhooks.
 */
class PaymentController extends Controller
{
    use AdminCrud;

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::enum(PaymentStatus::class)],
            'search' => ['nullable', 'string', 'max:100'],
            'needs_review' => ['nullable', 'boolean'],
        ]);

        $page = Payment::query()
            ->with('order:id,number,user_id,billing_name,billing_email')
            ->when($filters['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->when($request->boolean('needs_review'), fn ($q) => $q->where(fn ($r) => $r->where('is_duplicate', true)->orWhere('failure_reason', 'amount_mismatch')))
            ->when($filters['search'] ?? null, function ($q, $s) {
                $like = $this->like($s);
                $q->where(fn ($w) => $w
                    ->where('provider_invoice_id', 'ilike', $like)
                    ->orWhere('provider_payment_id', 'ilike', $like)
                    ->orWhereHas('order', fn ($o) => $o->where('number', 'ilike', $like)->orWhere('billing_email', 'ilike', $like)));
            })
            ->latest('id')
            ->paginate($this->perPage($request, 25))
            ->withQueryString();

        return $this->paginated($page, fn (Payment $p) => [
            'id' => $p->id,
            'provider' => $p->provider,
            'status' => ['value' => $p->status->value, 'label' => $p->status->label()],
            'amount' => Money::present($p->amount, $p->currency),
            'provider_invoice_id' => $p->provider_invoice_id,
            'provider_payment_id' => $p->provider_payment_id,
            'is_duplicate' => $p->is_duplicate,
            'failure_reason' => $p->failure_reason,
            'order' => $p->order ? ['number' => $p->order->number, 'billing_name' => $p->order->billing_name, 'billing_email' => $p->order->billing_email] : null,
            'verified_at' => $p->verified_at?->toIso8601String(),
            'paid_at' => $p->paid_at?->toIso8601String(),
            'created_at' => $p->created_at?->toIso8601String(),
        ]);
    }

    public function webhookEvents(Request $request): JsonResponse
    {
        $request->validate(['status' => ['nullable', Rule::in(['received', 'processed', 'ignored', 'failed'])]]);

        $page = PaymentWebhookEvent::query()
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->latest('id')
            ->paginate($this->perPage($request, 25))
            ->withQueryString();

        return $this->paginated($page, fn (PaymentWebhookEvent $e) => [
            'id' => $e->id,
            'provider' => $e->provider,
            'event_type' => $e->event_type,
            'provider_invoice_id' => $e->provider_invoice_id,
            'provider_payment_id' => $e->provider_payment_id,
            'signature_valid' => $e->signature_valid,
            'status' => $e->status,
            'error' => $e->error,
            'processed_at' => $e->processed_at?->toIso8601String(),
            'created_at' => $e->created_at?->toIso8601String(),
        ]);
    }
}
