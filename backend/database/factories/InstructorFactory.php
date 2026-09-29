<?php

namespace Database\Factories;

use App\Models\Instructor;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Instructor>
 */
class InstructorFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => 'أ. '.fake()->firstName(),
            'slug' => 'instructor-'.fake()->unique()->numberBetween(1, 999999),
            'headline' => fake()->sentence(4),
            'bio' => fake()->paragraph(),
            'is_active' => true,
            'sort_order' => 0,
        ];
    }
}
