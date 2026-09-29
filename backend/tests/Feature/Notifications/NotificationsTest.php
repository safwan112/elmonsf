<?php

use App\Jobs\SendBroadcast;
use App\Models\Broadcast;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Review;
use App\Models\User;
use App\Notifications\BroadcastNotification;
use App\Notifications\EnrollmentExpiringNotification;
use App\Notifications\ReviewModeratedNotification;
use App\Services\Commerce\EnrollmentService;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;

function databaseNotification(User $user, array $data, bool $read = false): string
{
    $id = (string) Str::uuid();
    $user->notifications()->create([
        'id' => $id,
        'type' => 'test',
        'data' => $data,
        'read_at' => $read ? now() : null,
    ]);

    return $id;
}

it('welcomes new users with an in-app notification', function () {
    $this->withHeaders(spaHeaders())->postJson('/api/v1/auth/register', [
        'name' => 'ريم الشهري',
        'email' => 'reem@example.com',
        'password' => 'Secret123',
        'password_confirmation' => 'Secret123',
    ])->assertCreated();

    $this->getJson('/api/v1/notifications')
        ->assertOk()
        ->assertJsonPath('unread_count', 1)
        ->assertJsonPath('data.0.type', 'welcome')
        ->assertJsonPath('data.0.url', '/dashboard/exams');
});

it('lists, reads and deletes only the user’s own notifications', function () {
    $user = User::factory()->student()->create();
    $other = User::factory()->student()->create();
    $first = databaseNotification($user, ['type' => 'order_paid', 'title' => 'تم الدفع', 'body' => 'x', 'url' => '/dashboard/orders/1']);
    databaseNotification($user, ['type' => 'x', 'title' => 'قديم', 'body' => 'y'], read: true);
    $foreign = databaseNotification($other, ['type' => 'x', 'title' => 'ليس لك', 'body' => 'z']);
    $evil = databaseNotification($user, ['type' => 'x', 'title' => 'رابط خارجي', 'body' => 'z', 'url' => '//evil.example']);

    $this->actingAs($user)->getJson('/api/v1/notifications')
        ->assertOk()->assertJsonCount(3, 'data')->assertJsonPath('unread_count', 2)->assertJsonMissing(['title' => 'ليس لك']);
    $this->actingAs($user)->getJson('/api/v1/notifications?filter=unread')->assertJsonCount(2, 'data');
    $this->actingAs($user)->getJson('/api/v1/notifications/unread-count')->assertJsonPath('data.unread_count', 2);

    // External links are never passed to the SPA.
    $this->actingAs($user)->getJson('/api/v1/notifications')->assertJsonFragment(['id' => $evil, 'url' => null]);

    $this->actingAs($user)->postJson("/api/v1/notifications/{$first}/read")->assertOk()->assertJsonPath('data.id', $first);
    $this->actingAs($user)->postJson("/api/v1/notifications/{$foreign}/read")->assertNotFound();
    $this->actingAs($user)->deleteJson("/api/v1/notifications/{$foreign}")->assertNotFound();

    $this->actingAs($user)->postJson('/api/v1/notifications/read-all')->assertOk();
    $this->actingAs($user)->getJson('/api/v1/notifications/unread-count')->assertJsonPath('data.unread_count', 0);
    expect($other->unreadNotifications()->count())->toBe(1);

    $this->actingAs($user)->deleteJson("/api/v1/notifications/{$first}")->assertOk();
    expect($user->notifications()->count())->toBe(2);
});

it('broadcasts announcements to an audience, emailing only opted-in users', function () {
    Notification::fake();
    $admin = User::factory()->admin()->create();
    $optedIn = User::factory()->student()->create();
    $optedOut = User::factory()->student()->create(['marketing_emails' => false]);
    $suspended = User::factory()->student()->suspended()->create();
    $teacher = User::factory()->instructor()->create();

    $this->actingAs($admin)->postJson('/api/v1/admin/broadcasts/preview', ['audience' => 'students'])
        ->assertOk()->assertJsonPath('data.recipients', 2)->assertJsonPath('data.email_recipients', 1);

    $this->actingAs($admin)->postJson('/api/v1/admin/broadcasts', [
        'title' => 'خصم 20%', 'body' => 'لفترة محدودة', 'url' => 'https://evil.example', 'audience' => 'students',
    ])->assertUnprocessable()->assertJsonValidationErrors('url');

    Queue::fake();
    $this->actingAs($admin)->postJson('/api/v1/admin/broadcasts', [
        'title' => 'خصم 20%', 'body' => 'لفترة محدودة', 'url' => '/courses', 'audience' => 'students', 'send_email' => true,
    ])->assertCreated()->assertJsonPath('data.status', 'queued');
    Queue::assertPushed(SendBroadcast::class);

    (new SendBroadcast(Broadcast::query()->sole()))->handle();

    expect(Broadcast::query()->sole())->status->toBe('sent')->recipients_count->toBe(2);
    Notification::assertSentTo($optedIn, BroadcastNotification::class, fn ($n, array $channels) => $channels === ['database', 'mail']);
    Notification::assertSentTo($optedOut, BroadcastNotification::class, fn ($n, array $channels) => $channels === ['database']);
    Notification::assertNotSentTo([$suspended, $teacher, $admin], BroadcastNotification::class);
});

it('targets current course subscribers only', function () {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create();
    $current = User::factory()->student()->create();
    $expired = User::factory()->student()->create();
    User::factory()->student()->create();
    enroll($current, $course);
    enroll($expired, $course)->forceFill(['expires_at' => now()->subDay()])->save();

    $this->actingAs($admin)->postJson('/api/v1/admin/broadcasts/preview', ['audience' => 'course'])
        ->assertUnprocessable()->assertJsonValidationErrors('course_id');
    $this->actingAs($admin)->postJson('/api/v1/admin/broadcasts/preview', ['audience' => 'course', 'course_id' => $course->id])
        ->assertJsonPath('data.recipients', 1);

    // Sync queue: sent immediately.
    $this->actingAs($admin)->postJson('/api/v1/admin/broadcasts', [
        'title' => 'حصة مباشرة', 'body' => 'غداً الساعة 8 مساءً', 'audience' => 'course', 'course_id' => $course->id,
    ])->assertCreated();
    expect($current->notifications()->count())->toBe(1)->and($expired->notifications()->count())->toBe(0);

    $this->actingAs($admin)->getJson('/api/v1/admin/broadcasts')->assertOk()->assertJsonPath('data.0.recipients_count', 1);
    $this->actingAs($current)->postJson('/api/v1/admin/broadcasts', ['title' => 'x', 'body' => 'y', 'audience' => 'all'])->assertForbidden();
});

it('reminds students once, 7 days and 1 day before access ends', function () {
    Notification::fake();
    $course = Course::factory()->create();
    $soon = User::factory()->student()->create();
    $tomorrow = User::factory()->student()->create();
    $later = User::factory()->student()->create();
    $inFiveDays = enroll($soon, $course, now()->addDays(5));
    enroll($tomorrow, $course, now()->addHours(12));
    enroll($later, $course, now()->addDays(30));

    $this->artisan('enrollments:remind-expiring')->assertSuccessful();
    $this->artisan('enrollments:remind-expiring')->assertSuccessful();

    Notification::assertSentToTimes($soon, EnrollmentExpiringNotification::class, 1);
    Notification::assertSentTo($soon, EnrollmentExpiringNotification::class, fn ($n) => $n->days === 7);
    // Tomorrow's student only gets the last-day reminder.
    Notification::assertSentToTimes($tomorrow, EnrollmentExpiringNotification::class, 1);
    Notification::assertSentTo($tomorrow, EnrollmentExpiringNotification::class, fn ($n) => $n->days === 1);
    Notification::assertNotSentTo($later, EnrollmentExpiringNotification::class);

    // Four days later the same student gets the 1-day reminder.
    $this->travel(4 * 24 + 2)->hours();
    $this->artisan('enrollments:remind-expiring')->assertSuccessful();
    Notification::assertSentToTimes($soon, EnrollmentExpiringNotification::class, 2);

    // Renewing resets the reminders.
    app(EnrollmentService::class)->grant($soon->id, $course->id, 90, null, null);
    expect(Enrollment::query()->find($inFiveDays->id))->reminded_7d_at->toBeNull()->reminded_1d_at->toBeNull();
});

it('tells students when their review is published', function () {
    Notification::fake();
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $review = Review::query()->create(['user_id' => $student->id, 'course_id' => $course->id, 'rating' => 5, 'status' => 'pending']);

    $this->actingAs($admin)->patchJson("/api/v1/admin/reviews/{$review->id}", ['status' => 'approved'])->assertOk();
    $this->actingAs($admin)->patchJson("/api/v1/admin/reviews/{$review->id}", ['status' => 'approved'])->assertOk();

    Notification::assertSentToTimes($student, ReviewModeratedNotification::class, 1);
});

it('lets users opt out of announcement emails', function () {
    $user = User::factory()->student()->create();

    $this->actingAs($user)->getJson('/api/v1/user')->assertJsonPath('data.marketing_emails', true);
    $this->actingAs($user)->patchJson('/api/v1/user/profile', ['marketing_emails' => false])
        ->assertOk()->assertJsonPath('data.marketing_emails', false);
    expect($user->refresh()->marketing_emails)->toBeFalse();
});
