<?php

use App\Enums\EnrollmentStatus;
use App\Models\Attachment;
use App\Models\Course;
use App\Models\Instructor;
use App\Models\Lesson;
use App\Models\LessonProgress;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->course = Course::factory()->withCurriculum(2, 3)->create();
    $this->lessons = Lesson::query()
        ->where('lessons.course_id', $this->course->id)
        ->join('sections', 'sections.id', '=', 'lessons.section_id')
        ->orderBy('sections.sort_order')->orderBy('lessons.sort_order')
        ->select('lessons.*')
        ->get();
    $this->preview = $this->lessons->firstWhere('is_preview', true);
    $this->paid = $this->lessons->firstWhere('is_preview', false);
    $this->student = User::factory()->student()->create();
});

it('requires authentication for learning endpoints', function () {
    $this->getJson("/api/v1/learning/courses/{$this->course->id}")->assertUnauthorized();
    $this->getJson("/api/v1/learning/lessons/{$this->paid->id}")->assertUnauthorized();
    $this->postJson("/api/v1/learning/lessons/{$this->paid->id}/progress", ['completed' => true])->assertUnauthorized();
});

it('locks paid lessons and the course player for students without an enrollment', function () {
    $this->actingAs($this->student)->getJson("/api/v1/learning/courses/{$this->course->id}")
        ->assertForbidden()->assertJsonPath('code', 'content_locked');
    $this->actingAs($this->student)->getJson("/api/v1/learning/lessons/{$this->paid->id}")
        ->assertForbidden()->assertJsonPath('code', 'content_locked')->assertJsonMissingPath('data');
    $this->actingAs($this->student)->postJson("/api/v1/learning/lessons/{$this->paid->id}/progress", ['completed' => true])
        ->assertForbidden();

    // Free preview lessons stay open.
    $this->actingAs($this->student)->getJson("/api/v1/learning/lessons/{$this->preview->id}")
        ->assertOk()->assertJsonPath('data.is_enrolled', false);
});

it('opens lessons to enrolled students with content, navigation and progress', function () {
    enroll($this->student, $this->course);
    $second = $this->lessons[1];

    $this->actingAs($this->student)->getJson("/api/v1/learning/lessons/{$second->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $second->id)
        ->assertJsonPath('data.is_enrolled', true)
        ->assertJsonPath('data.prev_lesson_id', $this->lessons[0]->id)
        ->assertJsonPath('data.next_lesson_id', $this->lessons[2]->id)
        ->assertJsonPath('data.course.id', $this->course->id)
        ->assertJsonStructure(['data' => ['content_html', 'video_embed_url', 'attachments', 'progress' => ['completed_at', 'position_seconds']]]);

    // Viewing is recorded for "continue where you left off".
    expect(LessonProgress::query()->where('user_id', $this->student->id)->where('lesson_id', $second->id)->value('last_viewed_at'))->not->toBeNull();
});

it('denies access once the enrollment expired or was revoked', function (string $state) {
    $enrollment = enroll($this->student, $this->course);
    $state === 'expired'
        ? $enrollment->forceFill(['expires_at' => now()->subMinute()])->save()
        : $enrollment->forceFill(['status' => EnrollmentStatus::Revoked, 'revoked_at' => now()])->save();

    $this->actingAs($this->student)->getJson("/api/v1/learning/lessons/{$this->paid->id}")->assertForbidden();
    $this->actingAs($this->student)->getJson("/api/v1/learning/courses/{$this->course->id}")->assertForbidden();
})->with(['expired', 'revoked']);

it('hides unpublished lessons and courses from students even when enrolled', function () {
    enroll($this->student, $this->course);
    $this->paid->forceFill(['is_published' => false])->save();

    $this->actingAs($this->student)->getJson("/api/v1/learning/lessons/{$this->paid->id}")->assertForbidden();

    $this->course->forceFill(['status' => 'draft'])->save();
    $this->actingAs($this->student)->getJson("/api/v1/learning/lessons/{$this->lessons[2]->id}")->assertForbidden();
});

it('lets admins and the course instructor open any lesson', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin)->getJson("/api/v1/learning/lessons/{$this->paid->id}")->assertOk();

    $teacher = User::factory()->instructor()->create();
    Instructor::query()->whereKey($this->course->instructor_id)->update(['user_id' => $teacher->id]);
    $this->actingAs($teacher)->getJson("/api/v1/learning/lessons/{$this->paid->id}")->assertOk();
    $this->actingAs($teacher)->getJson("/api/v1/learning/courses/{$this->course->id}")->assertOk();
});

it('tracks completion and reports course progress everywhere', function () {
    enroll($this->student, $this->course);

    $this->actingAs($this->student)->getJson("/api/v1/learning/courses/{$this->course->id}")
        ->assertOk()
        ->assertJsonPath('data.progress.total', 6)
        ->assertJsonPath('data.progress.completed', 0)
        ->assertJsonPath('data.next_lesson_id', $this->lessons[0]->id)
        ->assertJsonCount(2, 'data.curriculum');

    foreach ([0, 1, 2] as $i) {
        $this->actingAs($this->student)
            ->postJson("/api/v1/learning/lessons/{$this->lessons[$i]->id}/progress", ['completed' => true])
            ->assertOk()
            ->assertJsonPath('data.course_progress.completed', $i + 1);
    }

    $this->actingAs($this->student)->getJson("/api/v1/learning/courses/{$this->course->id}")
        ->assertJsonPath('data.progress.percent', 50)
        ->assertJsonPath('data.next_lesson_id', $this->lessons[3]->id)
        ->assertJsonPath('data.curriculum.0.lessons.0.is_completed', true)
        ->assertJsonPath('data.curriculum.1.lessons.0.is_completed', false);

    $this->actingAs($this->student)->getJson('/api/v1/enrollments')
        ->assertOk()
        ->assertJsonPath('data.0.progress.percent', 50)
        ->assertJsonPath('data.0.progress.completed', 3);

    // Unpublished lessons don't count.
    $this->lessons[5]->forceFill(['is_published' => false])->save();
    $this->actingAs($this->student)->getJson("/api/v1/learning/courses/{$this->course->id}")
        ->assertJsonPath('data.progress.total', 5)
        ->assertJsonPath('data.progress.percent', 60);
});

it('saves the playback position within the lesson length and keeps completion', function () {
    enroll($this->student, $this->course);
    $lesson = $this->paid;

    $this->actingAs($this->student)->postJson("/api/v1/learning/lessons/{$lesson->id}/progress", ['position_seconds' => 999999])
        ->assertUnprocessable()->assertJsonValidationErrors('position_seconds');

    $this->actingAs($this->student)->postJson("/api/v1/learning/lessons/{$lesson->id}/progress", ['position_seconds' => 80000])
        ->assertOk()->assertJsonPath('data.position_seconds', $lesson->duration_seconds);

    $this->actingAs($this->student)->postJson("/api/v1/learning/lessons/{$lesson->id}/progress", ['completed' => true])->assertOk();
    $this->actingAs($this->student)->postJson("/api/v1/learning/lessons/{$lesson->id}/progress", ['position_seconds' => 10])
        ->assertOk()->assertJsonPath('data.position_seconds', 10);
    expect(LessonProgress::query()->where('lesson_id', $lesson->id)->value('completed_at'))->not->toBeNull();

    // Explicitly un-marking works.
    $this->actingAs($this->student)->postJson("/api/v1/learning/lessons/{$lesson->id}/progress", ['completed' => false])
        ->assertOk()->assertJsonPath('data.completed_at', null);
});

it('streams attachments only to students who can open the lesson', function () {
    Storage::fake('local');
    Storage::disk('local')->put('attachments/notes.pdf', '%PDF-1.4 demo');
    $attachment = Attachment::query()->create([
        'lesson_id' => $this->paid->id, 'title' => 'ملخص الدرس', 'disk' => 'local', 'path' => 'attachments/notes.pdf',
        'mime_type' => 'application/pdf', 'size_bytes' => 13,
    ]);

    $this->actingAs($this->student)->get("/api/v1/learning/attachments/{$attachment->id}")->assertForbidden();

    enroll($this->student, $this->course);
    $response = $this->actingAs($this->student)->get("/api/v1/learning/attachments/{$attachment->id}")->assertOk();
    expect($response->streamedContent())->toBe('%PDF-1.4 demo')
        ->and($response->headers->get('content-disposition'))->toContain('attachment');

    $this->actingAs($this->student)->getJson("/api/v1/learning/lessons/{$this->paid->id}")
        ->assertJsonPath('data.attachments.0.title', 'ملخص الدرس')
        ->assertJsonMissingPath('data.attachments.0.path');

    Storage::disk('local')->delete('attachments/notes.pdf');
    $this->actingAs($this->student)->getJson("/api/v1/learning/attachments/{$attachment->id}")
        ->assertNotFound()->assertJsonPath('code', 'attachment_missing');
});
