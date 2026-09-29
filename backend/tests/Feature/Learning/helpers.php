<?php

use App\Enums\EnrollmentStatus;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\QuestionOption;
use App\Models\User;

function enroll(User $user, Course $course, ?DateTimeInterface $expiresAt = null, EnrollmentStatus $status = EnrollmentStatus::Active): Enrollment
{
    return Enrollment::query()->create([
        'user_id' => $user->id,
        'course_id' => $course->id,
        'source' => 'admin',
        'status' => $status,
        'starts_at' => now()->subDay(),
        'expires_at' => $expiresAt ?? now()->addMonth(),
    ]);
}

/** Correct option id of a question (the factories make the first one correct). */
function correctOptionId(int $questionId): int
{
    return (int) QuestionOption::query()->where('question_id', $questionId)->where('is_correct', true)->value('id');
}

function wrongOptionId(int $questionId): int
{
    return (int) QuestionOption::query()->where('question_id', $questionId)->where('is_correct', false)->value('id');
}

/** @return array<string, mixed> the attempt payload */
function startExam(object $test, User $user, Exam $exam): array
{
    return $test->actingAs($user)->postJson("/api/v1/exams/{$exam->id}/attempts")->assertSuccessful()->json('data');
}

function attemptModel(int $id): ExamAttempt
{
    return ExamAttempt::query()->findOrFail($id);
}
