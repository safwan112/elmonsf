<?php

namespace App\Services\Commerce;

use App\Enums\PurchasableType;

/**
 * One purchasable line, priced from the live catalog.
 */
final class PriceLine
{
    public int $discountAmount = 0;

    public function __construct(
        public readonly PurchasableType $type,
        public readonly int $purchasableId,
        public readonly string $title,
        public readonly int $unitAmount,
        public readonly ?int $courseId = null,
        public readonly ?int $productId = null,
        public readonly ?string $planName = null,
        public readonly ?int $durationDays = null,
        public readonly ?string $slug = null,
        public readonly ?int $cartItemId = null,
    ) {}

    public function totalAmount(): int
    {
        return $this->unitAmount - $this->discountAmount;
    }
}
