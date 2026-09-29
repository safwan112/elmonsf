<?php

use App\Enums\AttemptStatus;
use App\Models\Course;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\User;

beforeEach(function () {
    $this->student = User::factory()->student()->create();
    $this->course = Course::factory()->create();
    $this->free = Exam::factory()->withQuestions(4)->create(['title' => 'اختبار مجاني']);
    $this->courseExam = Exam::factory()->withQuestions(4)->create(['title' => 'اختبار الدورة', 'course_id' => $this->course->id]);
});

it('lists free exams and exams of enrolled courses only', function () {
    Exam::factory()->withQuestions(2)->draft()->create(['title' => 'مسودة']);

    $this->actingAs($this->student)->getJson('/api/v1/exams')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'اختبار مجاني')
        ->assertJsonPath('data.0.is_free', true)
        ->assertJsonPath('data.0.questions_count', 4);

    enroll($this->student, $this->course);
    $this->actingAs($this->student)->getJson('/api/v1/exams')->assertJsonCount(2, 'data');
    $this->actingAs($this->student)->getJson("/api/v1/exams?course_id={$this->course->id}")
        ->assertJsonCount(1, 'data')->assertJsonPath('data.0.course.id', $this->course->id);
});

it('locks course exams for students who are not enrolled and hides drafts', function () {
    $this->actingAs($this->student)->getJson("/api/v1/exams/{$this->courseExam->id}")
        ->assertForbidden()->assertJsonPath('code', 'content_locked');
    $this->actingAs($this->student)->postJson("/api/v1/exams/{$this->courseExam->id}/attempts")
        ->assertForbidden();

    $draft = Exam::factory()->withQuestions(2)->draft()->create();
    $this->actingAs($this->student)->getJson("/api/v1/exams/{$draft->id}")->assertNotFound();
    $this->actingAs($this->student)->postJson("/api/v1/exams/{$draft->id}/attempts")->assertNotFound();
});

it('starts an attempt without revealing the answers, and resumes it', function () {
    $response = $this->actingAs($this->student)->postJson("/api/v1/exams/{$this->free->id}/attempts")
        ->assertCreated()
        ->assertJsonPath('data.status.value', 'in_progress')
        ->assertJsonPath('data.questions_count', 4)
        ->assertJsonPath('data.result', null)
        ->assertJsonCount(4, 'data.questions')
        ->assertJsonCount(4, 'data.questions.0.options');

    $json = $response->getContent();
    expect($json)->not->toContain('is_correct')
        ->and($json)->not->toContain('correct_option_id')
        ->and($json)->not->toContain('explanation')
        ->and($response->json('data.remaining_seconds'))->toBeGreaterThan(1190);

    $again = $this->actingAs($this->student)->postJson("/api/v1/exams/{$this->free->id}/attempts")->assertOk();
    expect($again->json('data.id'))->toBe($response->json('data.id'))
        ->and(ExamAttempt::count())->toBe(1);

    $this->actingAs($this->student)->getJson("/api/v1/exams/{$this->free->id}")
        ->assertJsonPath('data.stats.in_progress_attempt_id', $response->json('data.id'));
});

it('autosaves answers and flags, validating question and option', function () {
    $attempt = startExam($this, $this->student, $this->free);
    [$q1, $q2] = [$attempt['questions'][0]['id'], $attempt['questions'][1]['id']];
    $url = "/api/v1/attempts/{$attempt['id']}/answers";

    $this->actingAs($this->student)->putJson($url, ['question_id' => $q1, 'option_id' => correctOptionId($q1)])
        ->assertOk()->assertJsonPath('data.option_id', correctOptionId($q1));

    // Flagging keeps the saved answer.
    $this->actingAs($this->student)->putJson($url, ['question_id' => $q1, 'flagged' => true])
        ->assertOk()->assertJsonPath('data.option_id', correctOptionId($q1))->assertJsonPath('data.is_flagged', true);

    // Option from another question, and a question outside the attempt.
    $this->actingAs($this->student)->putJson($url, ['question_id' => $q1, 'option_id' => correctOptionId($q2)])
        ->assertUnprocessable()->assertJsonPath('code', 'option_invalid');
    $foreign = $this->courseExam->questions()->first()->id;
    $this->actingAs($this->student)->putJson($url, ['question_id' => $foreign, 'option_id' => correctOptionId($foreign)])
        ->assertUnprocessable()->assertJsonPath('code', 'question_not_in_attempt');

    // Clearing an answer.
    $this->actingAs($this->student)->putJson($url, ['question_id' => $q1, 'option_id' => null])
        ->assertOk()->assertJsonPath('data.option_id', null)->assertJsonPath('data.is_flagged', true);

    $this->actingAs($this->student)->getJson("/api/v1/attempts/{$attempt['id']}")
        ->assertOk()
        ->assertJsonPath('data.questions.0.answer.is_flagged', true)
        ->assertJsonPath('data.answered_count', 0);
});

it('grades on the server and reveals the review after submitting', function () {
    $attempt = startExam($this, $this->student, $this->free);
    $url = "/api/v1/attempts/{$attempt['id']}/answers";
    $ids = array_column($attempt['questions'], 'id');

    // 2 correct, 1 wrong, 1 unanswered → 50% (pass mark 60%).
    $this->actingAs($this->student)->putJson($url, ['question_id' => $ids[0], 'option_id' => correctOptionId($ids[0])])->assertOk();
    $this->actingAs($this->student)->putJson($url, ['question_id' => $ids[1], 'option_id' => correctOptionId($ids[1])])->assertOk();
    $this->actingAs($this->student)->putJson($url, ['question_id' => $ids[2], 'option_id' => wrongOptionId($ids[2])])->assertOk();

    $this->actingAs($this->student)->postJson("/api/v1/attempts/{$attempt['id']}/submit")
        ->assertOk()
        ->assertJsonPath('data.status.value', 'submitted')
        ->assertJsonPath('data.result.score_points', 2)
        ->assertJsonPath('data.result.max_points', 4)
        ->assertJsonPath('data.result.percent', 50)
        ->assertJsonPath('data.result.passed', false)
        ->assertJsonPath('data.result.correct_count', 2)
        ->assertJsonPath('data.questions.0.is_correct', true)
        ->assertJsonPath('data.questions.2.is_correct', false)
        ->assertJsonPath('data.questions.2.correct_option_id', correctOptionId($ids[2]))
        ->assertJsonPath('data.questions.3.is_correct', false)
        ->assertJsonStructure(['data' => ['questions' => [['explanation_html']]]]);

    // Submitting again is harmless; answering is closed.
    $this->actingAs($this->student)->postJson("/api/v1/attempts/{$attempt['id']}/submit")
        ->assertOk()->assertJsonPath('data.result.score_points', 2);
    $this->actingAs($this->student)->putJson($url, ['question_id' => $ids[3], 'option_id' => correctOptionId($ids[3])])
        ->assertStatus(409)->assertJsonPath('code', 'attempt_closed');

    $this->actingAs($this->student)->getJson("/api/v1/exams/{$this->free->id}")
        ->assertJsonPath('data.stats.best_percent', 50)
        ->assertJsonPath('data.stats.in_progress_attempt_id', null)
        ->assertJsonCount(1, 'data.attempts');
});

it('keeps answers hidden after submitting when the exam disallows review', function () {
    $this->free->update(['show_answers' => false]);
    $attempt = startExam($this, $this->student, $this->free);

    $json = $this->actingAs($this->student)->postJson("/api/v1/attempts/{$attempt['id']}/submit")
        ->assertOk()
        ->assertJsonPath('data.result.score_points', 0)
        ->getContent();

    expect($json)->not->toContain('correct_option_id')->and($json)->not->toContain('explanation_html');
});

it('keeps attempts private to their owner', function () {
    $attempt = startExam($this, $this->student, $this->free);
    $other = User::factory()->student()->create();
    $q = $attempt['questions'][0]['id'];

    $this->actingAs($other)->getJson("/api/v1/attempts/{$attempt['id']}")->assertForbidden();
    $this->actingAs($other)->putJson("/api/v1/attempts/{$attempt['id']}/answers", ['question_id' => $q, 'option_id' => correctOptionId($q)])->assertForbidden();
    $this->actingAs($other)->postJson("/api/v1/attempts/{$attempt['id']}/submit")->assertForbidden();

    // Admins may look (support), but not answer for the student.
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin)->getJson("/api/v1/attempts/{$attempt['id']}")->assertOk();
    $this->actingAs($admin)->postJson("/api/v1/attempts/{$attempt['id']}/submit")->assertForbidden();
});

it('enforces the maximum number of attempts', function () {
    $this->free->update(['max_attempts' => 2]);

    foreach ([1, 2] as $n) {
        $attempt = startExam($this, $this->student, $this->free);
        $this->actingAs($this->student)->postJson("/api/v1/attempts/{$attempt['id']}/submit")->assertOk();
    }

    $this->actingAs($this->student)->postJson("/api/v1/exams/{$this->free->id}/attempts")
        ->assertStatus(409)->assertJsonPath('code', 'attempts_exhausted');
    $this->actingAs($this->student)->getJson("/api/v1/exams/{$this->free->id}")
        ->assertJsonPath('data.stats.attempts_left', 0);
});

it('closes attempts when time runs out, keeping the saved answers', function () {
    $attempt = startExam($this, $this->student, $this->free);
    $q = $attempt['questions'][0]['id'];
    $this->actingAs($this->student)->putJson("/api/v1/attempts/{$attempt['id']}/answers", ['question_id' => $q, 'option_id' => correctOptionId($q)])->assertOk();

    // Within the grace period a late save still counts.
    $this->travel(20 * 60 + 10)->seconds();
    $q2 = $attempt['questions'][1]['id'];
    $this->actingAs($this->student)->putJson("/api/v1/attempts/{$attempt['id']}/answers", ['question_id' => $q2, 'option_id' => correctOptionId($q2)])->assertOk();

    $this->travel(60)->seconds();
    $q3 = $attempt['questions'][2]['id'];
    $this->actingAs($this->student)->putJson("/api/v1/attempts/{$attempt['id']}/answers", ['question_id' => $q3, 'option_id' => correctOptionId($q3)])
        ->assertStatus(409)->assertJsonPath('code', 'attempt_closed');

    $this->actingAs($this->student)->getJson("/api/v1/attempts/{$attempt['id']}")
        ->assertOk()
        ->assertJsonPath('data.status.value', 'expired')
        ->assertJsonPath('data.result.score_points', 2);

    // A new attempt can be started afterwards.
    $this->actingAs($this->student)->postJson("/api/v1/exams/{$this->free->id}/attempts")->assertCreated();
});

it('grades abandoned attempts from the scheduler', function () {
    $attempt = startExam($this, $this->student, $this->free);
    $this->travel(2)->hours();

    $this->artisan('exams:close-expired')->assertSuccessful();

    expect(attemptModel($attempt['id'])->status)->toBe(AttemptStatus::Expired)
        ->and(attemptModel($attempt['id'])->percent)->toBe(0.0);
});

it('shuffles option order per attempt without changing the options', function () {
    $this->free->update(['shuffle_options' => true, 'shuffle_questions' => true]);
    $attempt = startExam($this, $this->student, $this->free);

    $ids = collect($attempt['questions'])->pluck('id')->sort()->values()->all();
    expect($ids)->toBe($this->free->questions()->pluck('questions.id')->sort()->values()->all());
    foreach ($attempt['questions'] as $question) {
        expect(collect($question['options'])->pluck('id')->sort()->values()->all())
            ->toHaveCount(4)
            ->toContain(correctOptionId($question['id']));
    }
});

it('refuses to start an exam without questions', function () {
    $empty = Exam::factory()->create();

    $this->actingAs($this->student)->postJson("/api/v1/exams/{$empty->id}/attempts")
        ->assertStatus(409)->assertJsonPath('code', 'exam_empty');
});
