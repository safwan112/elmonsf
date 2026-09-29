<?php

use App\Models\AuditLog;
use App\Models\User;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

/**
 * Turn the SPA link from the email into the API request the SPA makes.
 */
function verificationApiUrl(User $user): string
{
    $link = VerifyEmailNotification::urlFor($user);
    parse_str((string) parse_url($link, PHP_URL_QUERY), $q);

    return "/api/v1/auth/email/verify/{$q['id']}/{$q['hash']}?".http_build_query([
        'expires' => $q['expires'],
        'signature' => $q['signature'],
    ]);
}

it('sends an arabic verification email on registration', function () {
    Notification::fake();

    $this->withHeaders(spaHeaders())->postJson('/api/v1/auth/register', [
        'name' => 'ليان',
        'email' => 'layan@example.com',
        'password' => 'Secret123',
        'password_confirmation' => 'Secret123',
    ])->assertCreated();

    $user = User::where('email', 'layan@example.com')->firstOrFail();
    Notification::assertSentTo($user, VerifyEmailNotification::class, function ($notification) use ($user) {
        $mail = $notification->toMail($user);

        return $mail->subject === 'تأكيد بريدك الإلكتروني'
            && str_starts_with($mail->actionUrl, 'http://localhost:5173/verify-email?');
    });
});

it('verifies the email from a valid signed link without needing a session', function () {
    Event::fake([Verified::class]);
    $user = User::factory()->unverified()->student()->create();

    $this->withHeaders(spaHeaders())
        ->postJson(verificationApiUrl($user))
        ->assertOk()
        ->assertJsonPath('data.verified', true)
        ->assertJsonPath('message', 'تم تأكيد بريدك الإلكتروني بنجاح.');

    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
    Event::assertDispatched(Verified::class);
    expect(AuditLog::where('action', 'auth.email_verified')->where('subject_id', $user->id)->exists())->toBeTrue();
});

it('rejects tampered verification links', function () {
    $user = User::factory()->unverified()->create();
    $other = User::factory()->unverified()->create();

    // Signature for $user, but pointed at $other.
    $url = str_replace("/verify/{$user->id}/", "/verify/{$other->id}/", verificationApiUrl($user));

    $this->withHeaders(spaHeaders())
        ->postJson($url)
        ->assertForbidden()
        ->assertJsonPath('code', 'invalid_signature');

    expect($other->fresh()->hasVerifiedEmail())->toBeFalse();
});

it('rejects expired verification links', function () {
    $user = User::factory()->unverified()->create();
    $url = verificationApiUrl($user);

    $this->travel(VerifyEmailNotification::EXPIRES_MINUTES + 1)->minutes();

    $this->withHeaders(spaHeaders())->postJson($url)->assertForbidden();
    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

it('rejects links issued for a previous email address', function () {
    $user = User::factory()->unverified()->create(['email' => 'old@example.com']);
    $url = verificationApiUrl($user);
    $user->forceFill(['email' => 'new@example.com'])->save();

    $this->withHeaders(spaHeaders())->postJson($url)->assertForbidden();
});

it('resends the verification email to unverified users', function () {
    Notification::fake();
    RateLimiter::clear('auth-email');
    $user = User::factory()->unverified()->student()->create();

    $this->actingAs($user)
        ->withHeaders(spaHeaders())
        ->postJson('/api/v1/auth/email/verification-notification')
        ->assertAccepted();

    Notification::assertSentTo($user, VerifyEmailNotification::class);
});

it('does not resend to already verified users', function () {
    Notification::fake();
    $user = User::factory()->student()->create();

    $this->actingAs($user)
        ->postJson('/api/v1/auth/email/verification-notification')
        ->assertOk()
        ->assertJsonPath('message', 'بريدك الإلكتروني مؤكَّد بالفعل.');

    Notification::assertNothingSent();
});

it('limits verification email resends', function () {
    Notification::fake();
    $user = User::factory()->unverified()->student()->create();

    foreach (range(1, config('platform.auth_throttle.emails_per_hour')) as $_) {
        $this->actingAs($user)->postJson('/api/v1/auth/email/verification-notification')->assertAccepted();
    }

    $this->actingAs($user)->postJson('/api/v1/auth/email/verification-notification')->assertTooManyRequests();
});

it('blocks unverified users from routes that require a verified email', function () {
    Route::middleware(['api', 'auth:sanctum', 'verified'])->get('/api/v1/_test/verified-only', fn () => ['ok' => true]);

    $this->actingAs(User::factory()->unverified()->create())
        ->getJson('/api/v1/_test/verified-only')
        ->assertForbidden()
        ->assertJsonPath('code', 'email_unverified');

    $this->actingAs(User::factory()->create())
        ->getJson('/api/v1/_test/verified-only')
        ->assertOk();
});
