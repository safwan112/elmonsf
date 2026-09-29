<?php

namespace App\Http\Resources\Learning;

use App\Models\ExamAttempt;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Support\RichText;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An exam attempt with its questions in the frozen order.
 *
 * While in progress: questions, options and the student's saved answers
 * only. Once finished: the score, and, when the exam allows reviewing,
 * the correct option and explanation for every question.
 *
 * @mixin ExamAttempt
 */
class AttemptResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $exam = $this->exam;
        $finished = $this->status->isFinished();
        $review = $finished && $exam->show_answers;

        $questions = Question::query()
            ->whereIn('id', $this->questionIds())
            ->with('options')
            ->get()
            ->keyBy('id');
        $answers = $this->answers()->get()->keyBy('question_id');

        $items = [];
        foreach ($this->layout as $index => $item) {
            /** @var Question|null $question */
            $question = $questions->get($item['q']);
            if (! $question) {
                continue;
            }
            $options = $question->options->keyBy('id');
            $answer = $answers->get($question->id);
            $correct = $question->correctOption();

            $items[] = [
                'id' => $question->id,
                'number' => $index + 1,
                'points' => $item['p'],
                'body_html' => RichText::toHtml($question->body),
                'difficulty' => ['value' => $question->difficulty->value, 'label' => $question->difficulty->label()],
                'options' => collect($item['o'])
                    ->map(fn (int $id) => $options->get($id))
                    ->filter()
                    ->map(fn (QuestionOption $o) => ['id' => $o->id, 'body' => $o->body])
                    ->values(),
                'answer' => [
                    'option_id' => $answer?->option_id,
                    'is_flagged' => (bool) $answer?->is_flagged,
                ],
                ...($review ? [
                    'is_correct' => (bool) $answer?->is_correct,
                    'correct_option_id' => $correct?->id,
                    'explanation_html' => RichText::toHtml($question->explanation),
                ] : []),
            ];
        }

        return [
            'id' => $this->id,
            'status' => ['value' => $this->status->value, 'label' => $this->status->label()],
            'exam' => [
                'id' => $exam->id,
                'title' => $exam->title,
                'duration_minutes' => $exam->duration_minutes,
                'pass_percent' => $exam->pass_percent,
                'show_answers' => $exam->show_answers,
            ],
            'started_at' => $this->started_at->toIso8601String(),
            'deadline_at' => $this->deadline_at?->toIso8601String(),
            // Server-computed so a wrong client clock can't extend the time.
            'remaining_seconds' => ! $finished && $this->deadline_at ? max(0, now()->diffInSeconds($this->deadline_at, false)) : null,
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'answered_count' => $answers->whereNotNull('option_id')->count(),
            'questions_count' => count($this->layout),
            'result' => $finished ? [
                'score_points' => $this->score_points,
                'max_points' => $this->max_points,
                'percent' => $this->percent,
                'passed' => $this->passed,
                'correct_count' => $this->correct_count,
            ] : null,
            'questions' => $items,
        ];
    }
}
