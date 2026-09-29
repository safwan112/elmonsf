<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    public function definition(): array
    {
        $name = 'تصنيف '.fake()->unique()->numberBetween(1, 99999);

        return [
            'name' => $name,
            'slug' => 'cat-'.fake()->unique()->numberBetween(1, 999999),
            'description' => fake()->sentence(),
            'sort_order' => 0,
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(['is_active' => false]);
    }
}
