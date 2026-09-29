<?php

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use App\Notifications\SecurityAlertNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;

it('emails a reset link that points to the SPA', function () {
    Notification::fake();
    $user = User::factory()->create(['email' => 'reem@example.com']);

    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'Reem@Example.com'])
        ->assertOk()
        ->assertJsonPath('message', 'إذا كان البريد مسجلاً لدينا فستصلك رسالة لإعادة تعيين كلمة المرور.');

    Notification::assertSentTo($user, ResetPasswordNotification::class, function ($n) use ($user) {
        return str_starts_with($n->resetUrl($user), 'http://localhost:5173/reset-password?token=')
            && str_contains($n->resetUrl($user), 'email=reem%40example.com');
    });
});

it('answers identically for unknown emails (no account enumeration)', function () {
    Notification::fake();

    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.com'])
        ->assertOk()
        ->assertJsonPath('message', 'إذا كان البريد مسجلاً لدينا فستصلك رسالة لإعادة تعيين كلمة المرور.');

    Notification::assertNothingSent();
});

it('resets the password with a valid token and ends all sessions', function () {
    Notification::fake();
    config(['session.driver' => 'database']);
    $user = User::factory()->unverified()->create(['remember_token' => 'old-remember-token']);
    DB::table('sessions')->insert([
        ['id' => 'session-a', 'user_id' => $user->id, 'ip_address' => '1.1.1.1', 'user_agent' => 'x', 'payload' => '', 'last_activity' => time()],
        ['id' => 'session-b', 'user_id' => $user->id, 'ip_address' => '2.2.2.2', 'user_agent' => 'y', 'payload' => '', 'last_activity' => time()],
    ]);
    $token = Password::broker()->createToken($user);

    $this->postJson('/api/v1/auth/reset-password', [
        'token' => $token,
        'email' => $user->email,
        'password' => 'NewSecret123',
        'password_confirmation' => 'NewSecret123',
    ])->assertOk()->assertJsonPath('message', 'تمت إعادة تعيين كلمة المرور.');

    $user->refresh();
    expect(Hash::check('NewSecret123', $user->password))->toBeTrue()
        ->and($user->remember_token)->not->toBe('old-remember-token')
        ->and($user->hasVerifiedEmail())->toBeTrue()
        ->and(DB::table('sessions')->where('user_id', $user->id)->count())->toBe(0);

    Notification::assertSentTo($user, SecurityAlertNotification::class);
});

it('rejects invalid or reused reset tokens', function () {
    $user = User::factory()->create();
    $token = Password::broker()->createToken($user);
    $payload = ['email' => $user->email, 'password' => 'NewSecret123', 'password_confirmation' => 'NewSecret123'];

    $this->postJson('/api/v1/auth/reset-password', $payload + ['token' => 'wrong-token'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.email.0', 'رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية.');

    $this->postJson('/api/v1/auth/reset-password', $payload + ['token' => $token])->assertOk();
    $this->postJson('/api/v1/auth/reset-password', $payload + ['token' => $token])->assertUnprocessable();
});

it('rejects expired reset tokens', function () {
    $user = User::factory()->create();
    $token = Password::broker()->createToken($user);

    $this->travel(config('auth.passwords.users.expire') + 1)->minutes();

    $this->postJson('/api/v1/auth/reset-password', [
        'token' => $token,
        'email' => $user->email,
        'password' => 'NewSecret123',
        'password_confirmation' => 'NewSecret123',
    ])->assertUnprocessable();
});

it('enforces the password policy on reset', function () {
    $user = User::factory()->create();

    $this->postJson('/api/v1/auth/reset-password', [
        'token' => Password::broker()->createToken($user),
        'email' => $user->email,
        'password' => 'short',
        'password_confirmation' => 'short',
    ])->assertUnprocessable()->assertJsonValidationErrors(['password']);
});
