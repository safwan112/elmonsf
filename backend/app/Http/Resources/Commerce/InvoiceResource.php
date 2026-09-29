<?php

namespace App\Http\Resources\Commerce;

use App\Models\Invoice;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Invoice
 */
class InvoiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $money = fn (int $minor) => Money::present($minor, $this->currency);

        return [
            'number' => $this->number,
            'order_number' => $this->whenLoaded('order', fn () => $this->order->number),
            'issued_at' => $this->issued_at->toIso8601String(),
            'currency' => $this->currency,
            'vat_rate' => $this->vat_rate,
            'subtotal' => $money($this->subtotal_amount),
            'discount' => $money($this->discount_amount),
            'tax' => $money($this->tax_amount),
            'total' => $money($this->total_amount),
            'seller' => $this->seller,
            'buyer' => $this->buyer,
            'lines' => array_map(fn (array $line) => [
                'title' => $line['title'],
                'plan_name' => $line['plan_name'] ?? null,
                'unit_price' => $money((int) $line['unit_amount']),
                'discount' => $money((int) $line['discount_amount']),
                'total' => $money((int) $line['total_amount']),
            ], $this->lines),
        ];
    }
}
