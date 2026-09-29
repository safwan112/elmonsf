<?php

namespace App\Enums;

enum CouponScope: string
{
    case All = 'all';
    case Courses = 'courses';
    case Products = 'products';

    public function matches(PurchasableType $type): bool
    {
        return match ($this) {
            self::All => true,
            self::Courses => $type === PurchasableType::CoursePlan,
            self::Products => $type === PurchasableType::Product,
        };
    }
}
