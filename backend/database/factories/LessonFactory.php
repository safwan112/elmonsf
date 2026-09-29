<?php

namespace Database\Factories;

use App\Enums\LessonType;
use App\Models\Lesson;
use App\Models\Section;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Lesson>
 */
class LessonFactory extends Factory
{
    public function definition(): array
    {
        return [
            'section_id' => Section::factory(),
            'course_id' => fn (array $attrs) => Section::query()->find($attrs['section_id'])?->course_id,
            'title' => 'درس '.fake()->words(2, true),
            'type' => LessonType::Video,
            'content' => fake()->paragraph(),
            'duration_seconds' => fake()->numberBetween(300, 1800),
            'is_preview' => false,
            'is_published' => true,
            'sort_order' => 0,
        ];
    }
}
