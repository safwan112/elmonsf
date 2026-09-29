<?php

namespace App\Http\Resources\Commerce;

use App\Enums\PurchasableType;
use App\Services\Commerce\PriceLine;
use App\Services\Commerce\PriceSummary;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @property PriceSummary $resource
 */
class CartResource extends JsonResource
{
    /**
     * @param  list<string>  $removed
     */
    public function __construct(PriceSummary $summary, private readonly array $removed = [], private readonly ?string $couponError = null)
    {
        parent::__construct($summary);
    }

    public function toArray(Request $request): array
    {
        $s = $this->resource;
        $money = fn (int $minor) => Money::present($minor, $s->currency);

        return [
            'items' => array_map(fn (PriceLine $line) => [
                'id' => $line->cartItemId,
                'type' => $line->type->value,
                'purchasable_id' => $line->purchasableId,
                'title' => $line->title,
                'slug' => $line->slug,
                'plan_name' => $line->planName,
                'duration_days' => $line->durationDays,
                'url' => $line->type === PurchasableType::CoursePlan ? "/courses/{$line->slug}" : "/products/{$line->slug}",
                'unit_price' => $money($line->unitAmount),
                'discount' => $money($line->discountAmount),
                'total' => $money($line->totalAmount()),
            ], $s->lines),
            'count' => count($s->lines),
            'subtotal' => $money($s->subtotal),
            'discount' => $money($s->discount),
            'tax' => $money($s->tax),
            'total' => $money($s->total),
            'vat_rate' => $s->vatRate,
            'coupon' => $s->coupon ? ['code' => $s->coupon->code, 'description' => $s->coupon->description] : null,
            'notices' => array_values(array_filter([
                $this->removed ? ['code' => 'items_removed', 'message' => 'أزيلت عناصر لم تعد متاحة: '.implode('، ', $this->removed)] : null,
                $this->couponError ? ['code' => 'coupon_removed', 'message' => $this->couponError] : null,
            ])),
        ];
    }
}
