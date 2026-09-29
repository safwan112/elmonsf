<?php

namespace Database\Factories;

use App\Enums\ProductType;
use App\Enums\PublishStatus;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => 'منتج '.fake()->unique()->words(2, true),
            'slug' => 'product-'.fake()->unique()->numberBetween(1, 9999999),
            'type' => ProductType::Ebook,
            'subtitle' => fake()->sentence(),
            'description' => fake()->paragraph(),
            'price_amount' => 4900,
            'currency' => 'SAR',
            'status' => PublishStatus::Published,
            'published_at' => now()->subDay(),
        ];
    }

    public function draft(): static
    {
        return $this->state(['status' => PublishStatus::Draft, 'published_at' => null]);
    }
}
