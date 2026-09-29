<?php

namespace Database\Factories;

use App\Enums\CourseLevel;
use App\Enums\LessonType;
use App\Enums\PublishStatus;
use App\Models\Category;
use App\Models\Course;
use App\Models\CoursePlan;
use App\Models\Instructor;
use App\Models\Lesson;
use App\Models\Section;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Course>
 */
class CourseFactory extends Factory
{
    public function definition(): array
    {
        return [
            'category_id' => Category::factory(),
            'instructor_id' => Instructor::factory(),
            'title' => 'دورة '.fake()->unique()->words(3, true),
            'slug' => 'course-'.fake()->unique()->numberBetween(1, 9999999),
            'subtitle' => fake()->sentence(),
            'description' => fake()->paragraphs(2, true),
            'level' => CourseLevel::AllLevels,
            'language' => 'ar',
            'status' => PublishStatus::Published,
            'is_featured' => false,
            'published_at' => now()->subDay(),
            'outcomes' => [fake()->sentence(), fake()->sentence()],
            'requirements' => [fake()->sentence()],
        ];
    }

    public function draft(): static
    {
        return $this->state(['status' => PublishStatus::Draft, 'published_at' => null]);
    }

    public function scheduled(): static
    {
        return $this->state(['status' => PublishStatus::Published, 'published_at' => now()->addWeek()]);
    }

    public function featured(): static
    {
        return $this->state(['is_featured' => true]);
    }

    /**
     * @param  list<int>  $pricesInHalalas
     */
    public function withPlans(array $pricesInHalalas = [19900, 29900]): static
    {
        return $this->afterCreating(function (Course $course) use ($pricesInHalalas) {
            foreach ($pricesInHalalas as $i => $price) {
                CoursePlan::factory()->for($course)->create([
                    'name' => ($i + 1) * 3 .' أشهر',
                    'duration_days' => ($i + 1) * 90,
                    'price_amount' => $price,
                    'is_default' => $i === 0,
                    'sort_order' => $i,
                ]);
            }
        });
    }

    public function withCurriculum(int $sections = 2, int $lessonsPerSection = 3): static
    {
        return $this->afterCreating(function (Course $course) use ($sections, $lessonsPerSection) {
            for ($s = 0; $s < $sections; $s++) {
                $section = Section::factory()->for($course)->create(['sort_order' => $s]);
                for ($l = 0; $l < $lessonsPerSection; $l++) {
                    Lesson::factory()->for($course)->for($section)->create([
                        'sort_order' => $l,
                        'is_preview' => $s === 0 && $l === 0,
                        'type' => $l === 0 ? LessonType::Text : LessonType::Video,
                    ]);
                }
            }
        });
    }
}
