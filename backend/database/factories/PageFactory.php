<?php

namespace Database\Factories;

use App\Enums\PublishStatus;
use App\Models\Page;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Page>
 */
class PageFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => 'صفحة '.fake()->word(),
            'slug' => 'page-'.fake()->unique()->numberBetween(1, 9999999),
            'body' => fake()->paragraphs(2, true),
            'status' => PublishStatus::Published,
        ];
    }
}
