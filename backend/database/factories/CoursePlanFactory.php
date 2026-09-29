<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\CoursePlan;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CoursePlan>
 */
class CoursePlanFactory extends Factory
{
    public function definition(): array
    {
        return [
            'course_id' => Course::factory(),
            'name' => '3 أشهر',
            'duration_days' => 90,
            'price_amount' => 19900,
            'compare_at_amount' => null,
            'currency' => 'SAR',
            'is_active' => true,
            'is_default' => false,
            'sort_order' => 0,
        ];
    }
}
