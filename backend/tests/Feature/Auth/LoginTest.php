<?php

use App\Models\User;
use Illuminate\Support\Facades\RateLimiter;

beforeEach(fn () => RateLimiter::clear('auth'));

it('logs in with valid credentials', function () {
    $user = User::factory()->student()->create(['email' => 'student@example.com']);

    $this->withHeaders(spaHeaders())
        ->postJson('/api/v1/auth/login', [
            'email' => 'Student@Example.com',
            'password' => 'password',
            'remember' => true,
        ])
        ->assertOk()
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.roles', ['student']);

    $this->assertAuthenticatedAs($user);
    expect($user->fresh()->last_login_at)->not->toBeNull();
});

it('rejects invalid credentials without revealing which field was wrong', function () {
    User::factory()->create(['email' => 'student@example.com']);

    $this->withHeaders(spaHeaders())
        ->postJson('/api/v1/auth/login', ['email' => 'student@example.com', 'password' => 'wrong-password'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.email.0', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.');

    $this->assertGuest();
});

it('blocks suspended accounts', function () {
    User::factory()->student()->suspended()->create(['email' => 'blocked@example.com']);

    $this->withHeaders(spaHeaders())
        ->postJson('/api/v1/auth/login', ['email' => 'blocked@example.com', 'password' => 'password'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.email.0', 'تم إيقاف هذا الحساب. يرجى التواصل مع الدعم.');

    $this->assertGuest();
});

it('rate limits repeated login attempts', function () {
    User::factory()->create(['email' => 'student@example.com']);

    foreach (range(1, 5) as $_) {
        $this->withHeaders(spaHeaders())
            ->postJson('/api/v1/auth/login', ['email' => 'student@example.com', 'password' => 'nope'])
            ->assertUnprocessable();
    }

    $this->withHeaders(spaHeaders())
        ->postJson('/api/v1/auth/login', ['email' => 'student@example.com', 'password' => 'nope'])
        ->assertTooManyRequests()
        ->assertJsonPath('code', 'too_many_requests')
        ->assertHeader('Retry-After');
});

it('returns the authenticated user', function () {
    $user = User::factory()->admin()->create();

    $this->actingAs($user)
        ->getJson('/api/v1/user')
        ->assertOk()
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.roles', ['admin']);
});

it('rejects unauthenticated access to the current user', function () {
    $this->getJson('/api/v1/user')
        ->assertUnauthorized()
        ->assertExactJson(['message' => 'يجب تسجيل الدخول أولاً.', 'code' => 'unauthenticated']);
});

it('cuts off suspended users that still hold a session', function () {
    $user = User::factory()->student()->suspended()->create();

    $this->actingAs($user)
        ->getJson('/api/v1/user')
        ->assertForbidden()
        ->assertJsonPath('code', 'forbidden');
});

it('logs out and ends the session', function () {
    $user = User::factory()->student()->create();

    $this->withHeaders(spaHeaders())
        ->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'password'])
        ->assertOk();
    $this->assertAuthenticatedAs($user);

    $this->withHeaders(spaHeaders())
        ->postJson('/api/v1/auth/logout')
        ->assertOk()
        ->assertJsonPath('message', 'تم تسجيل الخروج.');

    $this->assertGuest('web');
});
