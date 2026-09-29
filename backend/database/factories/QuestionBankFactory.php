<?php

namespace Database\Factories;

use App\Models\Question;
use App\Models\QuestionBank;
use App\Models\QuestionOption;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<QuestionBank>
 */
class QuestionBankFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => 'بنك '.fake()->unique()->words(2, true),
            'description' => fake()->sentence(),
            'is_active' => true,
            'sort_order' => 0,
        ];
    }

    /**
     * Adds questions with 4 options each; the first option is correct.
     */
    public function withQuestions(int $count = 3, array $attributes = []): static
    {
        return $this->afterCreating(function (QuestionBank $bank) use ($count, $attributes) {
            for ($i = 0; $i < $count; $i++) {
                $question = Question::query()->create([
                    'question_bank_id' => $bank->id,
                    'body' => "سؤال رقم {$i}؟",
                    'explanation' => "شرح السؤال {$i}",
                    'difficulty' => $i % 2 === 0 ? 'easy' : 'hard',
                    'topic' => $i % 2 === 0 ? 'الجبر' : 'الهندسة',
                    'sort_order' => $i,
                    ...$attributes,
                ]);
                foreach (range(0, 3) as $o) {
                    QuestionOption::query()->create([
                        'question_id' => $question->id,
                        'body' => "خيار {$o}",
                        'is_correct' => $o === 0,
                        'sort_order' => $o,
                    ]);
                }
            }
        });
    }
}
