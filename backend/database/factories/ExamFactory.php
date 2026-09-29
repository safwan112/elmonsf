<?php

namespace Database\Factories;

use App\Enums\PublishStatus;
use App\Models\Exam;
use App\Models\QuestionBank;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Exam>
 */
class ExamFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => 'اختبار '.fake()->unique()->words(2, true),
            'description' => fake()->sentence(),
            'duration_minutes' => 20,
            'pass_percent' => 60,
            'max_attempts' => null,
            'shuffle_questions' => false,
            'shuffle_options' => false,
            'show_answers' => true,
            'status' => PublishStatus::Published,
            'published_at' => now()->subDay(),
        ];
    }

    public function draft(): static
    {
        return $this->state(['status' => PublishStatus::Draft, 'published_at' => null]);
    }

    /** Attach `$count` fresh questions (first option correct), 1 point each. */
    public function withQuestions(int $count = 4): static
    {
        return $this->afterCreating(function (Exam $exam) use ($count) {
            $bank = QuestionBank::factory()->withQuestions($count)->create();
            $exam->questions()->sync(
                $bank->questions()->orderBy('sort_order')->pluck('id')
                    ->mapWithKeys(fn ($id, $i) => [$id => ['points' => 1, 'sort_order' => $i]])
                    ->all()
            );
            $exam->refreshQuestionsCount();
        });
    }
}
