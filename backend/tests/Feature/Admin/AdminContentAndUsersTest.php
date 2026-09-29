<?php

use App\Enums\UserStatus;
use App\Models\AuditLog;
use App\Models\Course;
use App\Models\Post;
use App\Models\Review;
use App\Models\User;

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
});

it('publishes blog posts with tags and schedules them', function () {
    $post = $this->actingAs($this->admin)->postJson('/api/v1/admin/posts', [
        'title' => 'كيف تذاكر للقدرات',
        'body' => str_repeat('كلمة ', 450),
        'tags' => ['قدرات', 'نصائح'],
        'status' => 'published',
    ])->assertCreated()
        ->assertJsonPath('data.reading_minutes', 3)
        ->assertJsonCount(2, 'data.tags')
        ->json('data');

    $this->getJson('/api/v1/posts/'.urlencode($post['slug']))->assertOk();

    $this->actingAs($this->admin)->putJson("/api/v1/admin/posts/{$post['id']}", ['published_at' => now()->addWeek()->toIso8601String()])->assertOk();
    $this->getJson('/api/v1/posts/'.urlencode($post['slug']))->assertNotFound();

    $this->actingAs($this->admin)->deleteJson("/api/v1/admin/posts/{$post['id']}")->assertOk();
    expect(Post::withTrashed()->find($post['id'])->trashed())->toBeTrue();
});

it('manages pages, FAQs and testimonials', function () {
    $page = $this->actingAs($this->admin)->postJson('/api/v1/admin/pages', ['title' => 'من نحن', 'slug' => 'about-us', 'body' => '# أهلاً', 'status' => 'published'])
        ->assertCreated()->json('data');
    $this->getJson('/api/v1/pages/about-us')->assertOk()->assertJsonPath('data.title', 'من نحن');
    $this->actingAs($this->admin)->putJson("/api/v1/admin/pages/{$page['id']}", ['status' => 'draft'])->assertOk();
    $this->getJson('/api/v1/pages/about-us')->assertNotFound();

    $faq = $this->actingAs($this->admin)->postJson('/api/v1/admin/faqs', ['question' => 'هل يوجد استرجاع؟', 'answer' => 'نعم خلال 7 أيام', 'group' => 'payments'])
        ->assertCreated()->json('data');
    $this->getJson('/api/v1/faqs?group=payments')->assertOk()->assertJsonPath('data.0.question', 'هل يوجد استرجاع؟');
    $this->actingAs($this->admin)->deleteJson("/api/v1/admin/faqs/{$faq['id']}")->assertOk();

    $this->actingAs($this->admin)->postJson('/api/v1/admin/testimonials', ['name' => 'سارة', 'body' => 'تجربة رائعة', 'rating' => 6])
        ->assertUnprocessable()->assertJsonValidationErrors('rating');
    $this->actingAs($this->admin)->postJson('/api/v1/admin/testimonials', ['name' => 'سارة', 'body' => 'تجربة رائعة', 'rating' => 5])
        ->assertCreated()->assertJsonPath('data.is_active', true);
});

it('lets enrolled students review a course, published after moderation', function () {
    $course = Course::factory()->create(['rating_avg' => 0, 'rating_count' => 0]);
    $student = User::factory()->student()->create(['name' => 'ريم الشهري']);
    $outsider = User::factory()->student()->create();

    $this->actingAs($outsider)->putJson("/api/v1/courses/{$course->slug}/reviews/mine", ['rating' => 5])
        ->assertForbidden()->assertJsonPath('code', 'review_requires_enrollment');

    enroll($student, $course);
    $this->actingAs($student)->getJson("/api/v1/courses/{$course->slug}/reviews/mine")->assertJsonPath('data.can_review', true);
    $this->actingAs($student)->putJson("/api/v1/courses/{$course->slug}/reviews/mine", ['rating' => 4, 'comment' => '<b>مفيدة</b> جداً'])
        ->assertCreated()->assertJsonPath('data.status.value', 'pending')->assertJsonPath('data.comment', 'مفيدة جداً');

    $this->getJson("/api/v1/courses/{$course->slug}/reviews")->assertOk()->assertJsonCount(0, 'data');

    $review = Review::query()->sole();
    $this->actingAs($this->admin)->patchJson("/api/v1/admin/reviews/{$review->id}", ['status' => 'approved'])->assertOk();

    $this->getJson("/api/v1/courses/{$course->slug}/reviews")
        ->assertOk()
        ->assertJsonPath('data.0.rating', 4)
        ->assertJsonPath('data.0.author.name', 'ريم')
        ->assertJsonMissingPath('data.0.author.email');
    expect($course->refresh())->rating_count->toBe(1)->rating_avg->toBe(4.0);

    // Editing sends it back to moderation.
    $this->actingAs($student)->putJson("/api/v1/courses/{$course->slug}/reviews/mine", ['rating' => 2])
        ->assertOk()->assertJsonPath('data.status.value', 'pending');
    expect($course->refresh()->rating_count)->toBe(0);
});

it('suspends and re-roles other users, never oneself', function () {
    $user = User::factory()->student()->create();

    $this->actingAs($this->admin)->patchJson("/api/v1/admin/users/{$this->admin->id}", ['status' => 'suspended'])
        ->assertForbidden()->assertJsonPath('code', 'cannot_modify_self');

    $this->actingAs($this->admin)->patchJson("/api/v1/admin/users/{$user->id}", ['status' => 'suspended', 'roles' => ['student', 'instructor']])
        ->assertOk()
        ->assertJsonPath('data.status', 'suspended');
    expect($user->refresh()->status)->toBe(UserStatus::Suspended)
        ->and($user->load('roles')->roleNames())->toEqualCanonicalizing(['student', 'instructor']);

    $this->actingAs($this->admin)->patchJson("/api/v1/admin/users/{$user->id}", ['roles' => ['superuser']])
        ->assertUnprocessable()->assertJsonValidationErrors('roles.0');

    $log = AuditLog::query()->where('action', 'admin.user_updated')->sole();
    expect($log->metadata['before']['status'])->toBe('active')->and($log->metadata['after']['status'])->toBe('suspended');

    // The suspended user is locked out on the next request.
    $this->actingAs($user)->getJson('/api/v1/user')->assertForbidden();
});

it('keeps invoice settings private while exposing public ones', function () {
    $this->actingAs($this->admin)->putJson('/api/v1/admin/settings', [
        'site_name' => 'ذروة',
        'announcement' => 'خصم 20% هذا الأسبوع',
        'vat_number' => '300000000000003',
        'social' => ['x' => 'https://x.com/example'],
    ])->assertOk()->assertJsonPath('data.vat_number', '300000000000003');

    $this->actingAs($this->admin)->putJson('/api/v1/admin/settings', ['vat_number' => '12', 'social' => ['x' => 'javascript:alert(1)']])
        ->assertUnprocessable()->assertJsonValidationErrors(['vat_number', 'social.x']);
    $this->actingAs($this->admin)->putJson('/api/v1/admin/settings', ['unknown_key' => 'x'])->assertOk();

    $this->getJson('/api/v1/settings')
        ->assertOk()
        ->assertJsonPath('data.announcement', 'خصم 20% هذا الأسبوع')
        ->assertJsonPath('data.social.x', 'https://x.com/example')
        ->assertJsonMissingPath('data.vat_number')
        ->assertJsonMissingPath('data.unknown_key');
});

it('lists audit logs with filters and the dashboard KPIs', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/admin/faqs', ['question' => 'س', 'answer' => 'ج'])->assertCreated();
    $this->actingAs($this->admin)->postJson('/api/v1/admin/categories', ['name' => 'تصنيف'])->assertCreated();

    $this->actingAs($this->admin)->getJson('/api/v1/admin/audit-logs?action=faq')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.action', 'faq.created')
        ->assertJsonPath('data.0.actor.id', $this->admin->id);
    $this->actingAs($this->admin)->getJson('/api/v1/admin/audit-logs?action='.urlencode("x' or 1=1"))->assertUnprocessable();

    $this->actingAs($this->admin)->getJson('/api/v1/admin/overview')
        ->assertOk()
        ->assertJsonStructure(['data' => [
            'users' => ['total'],
            'sales' => ['revenue_total', 'revenue_last_30_days', 'paid_orders_last_30_days', 'pending_orders', 'daily', 'top_courses'],
            'learning' => ['active_enrollments'],
            'attention' => ['pending_reviews', 'new_messages', 'payments_needing_review'],
        ]])
        ->assertJsonCount(30, 'data.sales.daily');
});
