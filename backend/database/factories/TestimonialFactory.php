<?php

namespace Database\Factories;

use App\Models\Testimonial;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Testimonial>
 */
class TestimonialFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->firstName(),
            'subtitle' => 'طالب',
            'body' => fake()->sentence(12),
            'rating' => 5,
            'sort_order' => 0,
            'is_active' => true,
        ];
    }
}
