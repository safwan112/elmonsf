<?php

namespace Database\Factories;

use App\Enums\PublishStatus;
use App\Models\Post;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Post>
 */
class PostFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => 'مقال '.fake()->unique()->words(3, true),
            'slug' => 'post-'.fake()->unique()->numberBetween(1, 9999999),
            'excerpt' => fake()->sentence(),
            'body' => fake()->paragraphs(3, true),
            'status' => PublishStatus::Published,
            'published_at' => now()->subDay(),
        ];
    }

    public function draft(): static
    {
        return $this->state(['status' => PublishStatus::Draft, 'published_at' => null]);
    }
}
