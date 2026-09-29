<?php

namespace Database\Factories;

use App\Enums\CouponScope;
use App\Enums\CouponType;
use App\Models\Coupon;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Coupon>
 */
class CouponFactory extends Factory
{
    public function definition(): array
    {
        return [
            'code' => 'SAVE'.fake()->unique()->numberBetween(100, 999999),
            'type' => CouponType::Percent,
            'value' => 20,
            'applies_to' => CouponScope::All,
            'is_active' => true,
        ];
    }

    public function fixed(int $halalas): static
    {
        return $this->state(['type' => CouponType::Fixed, 'value' => $halalas]);
    }
}
