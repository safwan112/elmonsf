<?php

use App\Models\Category;
use App\Models\Course;
use App\Models\CoursePlan;
use App\Models\Instructor;
use App\Models\Lesson;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Section;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
    $this->category = Category::factory()->create();
});

function instructorWithProfile(): array
{
    $user = User::factory()->instructor()->create();
    $profile = Instructor::factory()->create(['user_id' => $user->id]);

    return [$user, $profile];
}

it('keeps students out of course management', function () {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();

    $this->getJson('/api/v1/admin/courses')->assertUnauthorized();
    $this->actingAs($student)->getJson('/api/v1/admin/courses')->assertForbidden();
    $this->actingAs($student)->postJson('/api/v1/admin/courses', ['title' => 'x', 'category_id' => $this->category->id])->assertForbidden();
    $this->actingAs($student)->putJson("/api/v1/admin/courses/{$course->id}", ['title' => 'x'])->assertForbidden();
});

it('creates a course with tags, a unique slug and publishes it', function () {
    Course::factory()->create(['slug' => 'دورة-الكمي']);

    $response = $this->actingAs($this->admin)->postJson('/api/v1/admin/courses', [
        'title' => 'دورة الكمي',
        'category_id' => $this->category->id,
        'level' => 'beginner',
        'status' => 'published',
        'outcomes' => ['حل المسائل بسرعة'],
        'tags' => ['قدرات', 'كمي', 'قدرات'],
    ])->assertCreated()
        ->assertJsonPath('data.slug', 'دورة-الكمي-2')
        ->assertJsonPath('data.status.value', 'published')
        ->assertJsonPath('data.level', 'beginner')
        ->assertJsonCount(2, 'data.tags');

    expect($response->json('data.published_at'))->not->toBeNull();
    $this->getJson('/api/v1/courses/'.urlencode('دورة-الكمي-2'))->assertOk();
});

it('manages plans in SAR with a single default and keeps sold plans', function () {
    $course = Course::factory()->create();

    $first = $this->actingAs($this->admin)->postJson("/api/v1/admin/courses/{$course->id}/plans", [
        'name' => '3 أشهر', 'duration_days' => 90, 'price' => 199.5, 'compare_at_price' => 299, 'is_default' => true,
    ])->assertCreated()->assertJsonPath('data.price', 199.5)->json('data');
    expect(CoursePlan::query()->find($first['id'])->price_amount)->toBe(19950);

    $this->actingAs($this->admin)->postJson("/api/v1/admin/courses/{$course->id}/plans", [
        'name' => 'سنة', 'duration_days' => 365, 'price' => 399, 'is_default' => true,
    ])->assertCreated();
    expect(CoursePlan::query()->find($first['id'])->is_default)->toBeFalse();

    $this->actingAs($this->admin)->postJson("/api/v1/admin/courses/{$course->id}/plans", ['name' => 'x', 'price' => 100, 'compare_at_price' => 50])
        ->assertUnprocessable()->assertJsonValidationErrors('compare_at_price');

    // A plan that was sold is deactivated, not deleted.
    $order = Order::query()->create([
        'number' => 'ORD-TEST-1', 'user_id' => $this->admin->id, 'subtotal_amount' => 19950, 'total_amount' => 19950,
        'billing_name' => 'x', 'billing_email' => 'x@example.com',
    ]);
    OrderItem::query()->create([
        'order_id' => $order->id, 'purchasable_type' => 'course_plan', 'purchasable_id' => $first['id'], 'course_id' => $course->id,
        'title' => $course->title, 'unit_amount' => 19950, 'total_amount' => 19950,
    ]);
    $this->actingAs($this->admin)->deleteJson("/api/v1/admin/plans/{$first['id']}")
        ->assertOk()->assertJsonPath('data.is_active', false);
    expect(CoursePlan::query()->find($first['id']))->not->toBeNull();
});

it('builds and reorders the curriculum', function () {
    $course = Course::factory()->create();

    $s1 = $this->actingAs($this->admin)->postJson("/api/v1/admin/courses/{$course->id}/sections", ['title' => 'البداية'])->assertCreated()->json('data.id');
    $s2 = $this->actingAs($this->admin)->postJson("/api/v1/admin/courses/{$course->id}/sections", ['title' => 'الجبر'])->assertCreated()->json('data.id');

    $lesson = $this->actingAs($this->admin)->postJson("/api/v1/admin/sections/{$s1}/lessons", [
        'title' => 'مقدمة', 'type' => 'video', 'video_provider' => 'youtube', 'video_ref' => 'dQw4w9WgXcQ', 'duration_seconds' => 300, 'is_preview' => true,
    ])->assertCreated()->assertJsonPath('data.video_ref', 'dQw4w9WgXcQ')->json('data.id');

    $this->actingAs($this->admin)->postJson("/api/v1/admin/sections/{$s1}/lessons", ['title' => 'x', 'type' => 'video', 'video_ref' => '"><script>'])
        ->assertUnprocessable()->assertJsonValidationErrors('video_ref');

    expect($course->refresh()->lessons_count)->toBe(1)->and($course->duration_seconds)->toBe(300);

    $this->actingAs($this->admin)->putJson("/api/v1/admin/courses/{$course->id}/sections/order", ['ids' => [$s2, $s1]])->assertOk();
    $this->actingAs($this->admin)->getJson("/api/v1/admin/courses/{$course->id}")
        ->assertJsonPath('data.sections.0.id', $s2)
        ->assertJsonPath('data.sections.1.lessons.0.id', $lesson);

    // Ids from another course are rejected.
    $other = Section::factory()->create();
    $this->actingAs($this->admin)->putJson("/api/v1/admin/courses/{$course->id}/sections/order", ['ids' => [$s2, $other->id]])
        ->assertUnprocessable();

    $this->actingAs($this->admin)->deleteJson("/api/v1/admin/sections/{$s1}")->assertOk();
    expect(Lesson::query()->find($lesson))->toBeNull()->and($course->refresh()->lessons_count)->toBe(0);
});

it('stores lesson attachments on the private disk', function () {
    Storage::fake('local');
    $course = Course::factory()->withCurriculum(1, 1)->create();
    $lesson = $course->lessons()->first();

    $id = $this->actingAs($this->admin)->post("/api/v1/admin/lessons/{$lesson->id}/attachments", [
        'file' => UploadedFile::fake()->create('ورقة.pdf', 20, 'application/pdf'),
        'title' => 'ورقة عمل',
    ], ['Accept' => 'application/json'])->assertCreated()->json('data.id');

    $attachment = $lesson->attachments()->findOrFail($id);
    Storage::disk('local')->assertExists($attachment->path);
    expect($attachment->path)->toStartWith("attachments/{$course->id}/");

    $this->actingAs($this->admin)->post("/api/v1/admin/lessons/{$lesson->id}/attachments", [
        'file' => UploadedFile::fake()->create('x.php', 1, 'application/x-php'),
    ], ['Accept' => 'application/json'])->assertUnprocessable();

    $this->actingAs($this->admin)->deleteJson("/api/v1/admin/attachments/{$id}")->assertOk();
    Storage::disk('local')->assertMissing($attachment->path);
});

it('scopes instructors to their own courses', function () {
    [$teacher, $profile] = instructorWithProfile();
    $own = Course::factory()->create(['instructor_id' => $profile->id, 'title' => 'دورتي']);
    $foreign = Course::factory()->create(['title' => 'دورة غيري']);

    $this->actingAs($teacher)->getJson('/api/v1/admin/courses')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $own->id);

    $this->actingAs($teacher)->getJson("/api/v1/admin/courses/{$foreign->id}")->assertForbidden();
    $this->actingAs($teacher)->putJson("/api/v1/admin/courses/{$foreign->id}", ['title' => 'x'])->assertForbidden();
    $this->actingAs($teacher)->postJson("/api/v1/admin/courses/{$foreign->id}/sections", ['title' => 'x'])->assertForbidden();

    // Own course: editable, but the instructor cannot be reassigned or the course deleted.
    $this->actingAs($teacher)->putJson("/api/v1/admin/courses/{$own->id}", ['title' => 'دورتي المحدّثة', 'instructor_id' => $foreign->instructor_id])
        ->assertOk()->assertJsonPath('data.title', 'دورتي المحدّثة')->assertJsonPath('data.instructor_id', $profile->id);
    $this->actingAs($teacher)->postJson("/api/v1/admin/courses/{$own->id}/sections", ['title' => 'قسم'])->assertCreated();
    $this->actingAs($teacher)->deleteJson("/api/v1/admin/courses/{$own->id}")->assertForbidden();

    // New courses are theirs.
    $this->actingAs($teacher)->postJson('/api/v1/admin/courses', ['title' => 'جديدة', 'category_id' => $this->category->id])
        ->assertCreated()->assertJsonPath('data.instructor_id', $profile->id)->assertJsonPath('data.status.value', 'draft');

    // The rest of the admin stays off limits.
    $this->actingAs($teacher)->getJson('/api/v1/admin/users')->assertForbidden();
    $this->actingAs($teacher)->getJson('/api/v1/admin/orders')->assertForbidden();
    $this->actingAs($teacher)->getJson('/api/v1/admin/categories')->assertForbidden();
});

it('soft deletes courses so history is kept', function () {
    $course = Course::factory()->create();

    $this->actingAs($this->admin)->deleteJson("/api/v1/admin/courses/{$course->id}")->assertOk();

    expect(Course::withTrashed()->find($course->id)->trashed())->toBeTrue();
    $this->getJson("/api/v1/courses/{$course->slug}")->assertNotFound();
});
