<?php

namespace App\Services\Learning;

use App\Enums\AttemptStatus;
use App\Exceptions\DomainException;
use App\Models\AttemptAnswer;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Exam attempts: start/resume, autosave answers, submit and grade.
 * Grading happens only on the server; the client never receives which
 * option is correct until the attempt is finished (and only if the exam
 * allows reviewing answers).
 */
class ExamService
{
    /** Seconds of tolerance after the deadline for in-flight saves/submits. */
    public const GRACE_SECONDS = 30;

    public function start(User $user, Exam $exam): ExamAttempt
    {
        return DB::transaction(function () use ($user, $exam) {
            // Serialise concurrent "start" clicks for this user.
            User::query()->whereKey($user->id)->lockForUpdate()->first();

            $current = ExamAttempt::query()
                ->where('user_id', $user->id)
                ->where('exam_id', $exam->id)
                ->where('status', AttemptStatus::InProgress)
                ->latest('id')
                ->first();

            if ($current) {
                if (! $current->isOverdue()) {
                    return $current;
                }
                $this->finish($current, AttemptStatus::Expired);
            }

            if ($exam->max_attempts !== null) {
                $used = ExamAttempt::query()->where('user_id', $user->id)->where('exam_id', $exam->id)->count();
                if ($used >= $exam->max_attempts) {
                    throw new DomainException(__('learning.attempts_exhausted'), 'attempts_exhausted', 409);
                }
            }

            $questions = $exam->questions()->where('questions.is_active', true)->with('options')->get();
            if ($questions->isEmpty()) {
                throw new DomainException(__('learning.exam_empty'), 'exam_empty', 409);
            }
            if ($exam->shuffle_questions) {
                $questions = $questions->shuffle();
            }

            $layout = $questions->map(function (Question $q) use ($exam) {
                $options = $q->options->pluck('id')->map(fn ($id) => (int) $id);

                return [
                    'q' => $q->id,
                    'o' => ($exam->shuffle_options ? $options->shuffle() : $options)->values()->all(),
                    'p' => max(1, (int) $q->pivot->points),
                ];
            })->values()->all();

            $now = now();

            return ExamAttempt::query()->create([
                'user_id' => $user->id,
                'exam_id' => $exam->id,
                'status' => AttemptStatus::InProgress,
                'layout' => $layout,
                'started_at' => $now,
                'deadline_at' => $exam->duration_minutes ? $now->copy()->addMinutes($exam->duration_minutes) : null,
                'max_points' => array_sum(array_column($layout, 'p')),
            ]);
        });
    }

    /**
     * Save (or clear) the answer to one question and its "flag for review"
     * marker. An attempt whose time is up is graded instead.
     */
    public function saveAnswer(ExamAttempt $attempt, int $questionId, bool $setOption, ?int $optionId, ?bool $flagged): AttemptAnswer
    {
        // Time is up: grade it now and reject the change.
        if ($this->closeIfOverdue($attempt)->status->isFinished()) {
            throw new DomainException(__('learning.attempt_closed'), 'attempt_closed', 409);
        }

        return DB::transaction(function () use ($attempt, $questionId, $setOption, $optionId, $flagged) {
            /** @var ExamAttempt $locked */
            $locked = ExamAttempt::query()->whereKey($attempt->id)->lockForUpdate()->firstOrFail();
            if (! $locked->isInProgress() || $locked->isOverdue(self::GRACE_SECONDS)) {
                throw new DomainException(__('learning.attempt_closed'), 'attempt_closed', 409);
            }

            $item = collect($locked->layout)->firstWhere('q', $questionId);
            if (! $item) {
                throw new DomainException(__('learning.question_not_in_attempt'), 'question_not_in_attempt');
            }
            if ($optionId !== null && ! in_array($optionId, $item['o'], true)) {
                throw new DomainException(__('learning.option_invalid'), 'option_invalid');
            }

            $answer = AttemptAnswer::query()->firstOrNew(['exam_attempt_id' => $locked->id, 'question_id' => $questionId]);
            // Only fields that were sent change, so flagging keeps the answer.
            if ($setOption) {
                $answer->option_id = $optionId;
                $answer->answered_at = $optionId !== null ? now() : null;
            }
            if ($flagged !== null) {
                $answer->is_flagged = $flagged;
            }
            $answer->save();

            return $answer;
        });
    }

    /** Submit (idempotent: a finished attempt is returned unchanged). */
    public function submit(ExamAttempt $attempt): ExamAttempt
    {
        return DB::transaction(function () use ($attempt) {
            /** @var ExamAttempt $locked */
            $locked = ExamAttempt::query()->whereKey($attempt->id)->lockForUpdate()->firstOrFail();
            if (! $locked->isInProgress()) {
                return $locked;
            }

            // Submitting well after the deadline counts as a timeout.
            $status = $locked->isOverdue(self::GRACE_SECONDS) ? AttemptStatus::Expired : AttemptStatus::Submitted;

            return $this->finish($locked, $status);
        });
    }

    /** Grade and close attempts whose time is up (used lazily and by the scheduler). */
    public function closeIfOverdue(ExamAttempt $attempt): ExamAttempt
    {
        if (! $attempt->isInProgress() || ! $attempt->isOverdue(self::GRACE_SECONDS)) {
            return $attempt;
        }

        return DB::transaction(function () use ($attempt) {
            /** @var ExamAttempt $locked */
            $locked = ExamAttempt::query()->whereKey($attempt->id)->lockForUpdate()->firstOrFail();

            return $locked->isInProgress() ? $this->finish($locked, AttemptStatus::Expired) : $locked;
        });
    }

    public function closeExpired(): int
    {
        $count = 0;
        ExamAttempt::query()
            ->where('status', AttemptStatus::InProgress)
            ->whereNotNull('deadline_at')
            ->where('deadline_at', '<', now()->subSeconds(self::GRACE_SECONDS))
            ->orderBy('id')
            ->each(function (ExamAttempt $attempt) use (&$count) {
                $this->closeIfOverdue($attempt);
                $count++;
            });

        return $count;
    }

    /** Grade against the frozen layout. Caller holds the row lock. */
    private function finish(ExamAttempt $attempt, AttemptStatus $status): ExamAttempt
    {
        $correctIds = QuestionOption::query()
            ->whereIn('question_id', $attempt->questionIds())
            ->where('is_correct', true)
            ->get(['id', 'question_id'])
            ->groupBy('question_id')
            ->map(fn ($options) => $options->pluck('id')->map(fn ($id) => (int) $id)->all());

        $answers = $attempt->answers()->get()->keyBy('question_id');
        $score = 0;
        $correct = 0;

        foreach ($attempt->layout as $item) {
            /** @var AttemptAnswer|null $answer */
            $answer = $answers->get($item['q']);
            $isCorrect = $answer?->option_id !== null && in_array((int) $answer->option_id, $correctIds[$item['q']] ?? [], true);

            if ($isCorrect) {
                $score += $item['p'];
                $correct++;
            }
            if ($answer) {
                $answer->forceFill(['is_correct' => $isCorrect])->save();
            }
        }

        $percent = $attempt->max_points > 0 ? round($score * 100 / $attempt->max_points, 2) : 0.0;
        $passPercent = (int) $attempt->exam()->value('pass_percent');

        $attempt->forceFill([
            'status' => $status,
            'submitted_at' => now(),
            'score_points' => $score,
            'correct_count' => $correct,
            'percent' => $percent,
            'passed' => $percent >= $passPercent,
        ])->save();

        return $attempt;
    }
}
