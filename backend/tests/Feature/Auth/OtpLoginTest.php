<?php

use App\Enums\OtpPurpose;
use App\Http\Controllers\Api\V1\Auth\OtpLoginController;
use App\Models\OtpCode;
use App\Models\User;
use App\Notifications\OtpCodeNotification;
use App\Services\OtpService;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;

beforeEach(function () {
    Notification::fake();
    RateLimiter::clear('auth');
});

/** Request a code and capture it from the (faked) notification. */
function requestOtp(object $test, User $user): string
{
    $test->withHeaders(spaHeaders())
        ->postJson('/api/v1/auth/otp/send', ['email' => $user->email])
        ->assertOk();

    $code = null;
    Notification::assertSentTo($user, OtpCodeNotification::class, function ($n) use (&$code) {
        $code = $n->code;

        return true;
    });

    return $code;
}

it('sends a six digit code and stores only its hash', function () {
    $user = User::factory()->student()->create();

    $code = requestOtp($this, $user);

    expect($code)->toMatch('/^\d{6}$/');
    $otp = OtpCode::where('user_id', $user->id)->sole();
    expect($otp->code_hash)->not->toBe($code)
        ->and($otp->purpose)->toBe(OtpPurpose::Login)
        ->and($otp->expires_at->isFuture())->toBeTrue();
});

it('gives the same answer for unknown emails', function () {
    $this->withHeaders(spaHeaders())
        ->postJson('/api/v1/auth/otp/send', ['email' => 'ghost@example.com'])
        ->assertOk()
        ->assertJsonPath('message', 'إذا كان البريد مسجلاً لدينا فستصلك رسالة تحتوي على رمز الدخول.');

    Notification::assertNothingSent();
});

it('enforces a cooldown between codes', function () {
    $user = User::factory()->create();
    requestOtp($this, $user);

    $this->withHeaders(spaHeaders())
        ->postJson('/api/v1/auth/otp/send', ['email' => $user->email])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);

    $this->travel(OtpLoginController::RESEND_COOLDOWN + 1)->seconds();

    $this->withHeaders(spaHeaders())->postJson('/api/v1/auth/otp/send', ['email' => $user->email])->assertOk();
    expect(OtpCode::where('user_id', $user->id)->active()->count())->toBe(1);
});

it('signs in with a valid code (including arabic-indic digits) and verifies the email', function () {
    $user = User::factory()->unverified()->student()->create();
    $code = requestOtp($this, $user);
    $arabicDigits = strtr($code, ['0' => '٠', '1' => '١', '2' => '٢', '3' => '٣', '4' => '٤', '5' => '٥', '6' => '٦', '7' => '٧', '8' => '٨', '9' => '٩']);

    $this->withHeaders(spaHeaders())
        ->postJson('/api/v1/auth/otp/verify', ['email' => $user->email, 'code' => $arabicDigits])
        ->assertOk()
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.email_verified', true);

    $this->assertAuthenticatedAs($user);
});

it('cannot reuse a code', function () {
    $user = User::factory()->create();
    $code = requestOtp($this, $user);

    $this->withHeaders(spaHeaders())->postJson('/api/v1/auth/otp/verify', ['email' => $user->email, 'code' => $code])->assertOk();
    auth()->guard('web')->logout();

    $this->withHeaders(spaHeaders())
        ->postJson('/api/v1/auth/otp/verify', ['email' => $user->email, 'code' => $code])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code.0', 'الرمز غير صحيح أو منتهي الصلاحية.');
});

it('locks the code after too many wrong attempts', function () {
    config(['platform.auth_throttle.per_email_ip' => 100]);
    $user = User::factory()->create();
    $code = requestOtp($this, $user);
    $wrong = $code === '000000' ? '111111' : '000000';

    foreach (range(1, OtpService::MAX_ATTEMPTS) as $_) {
        $this->withHeaders(spaHeaders())
            ->postJson('/api/v1/auth/otp/verify', ['email' => $user->email, 'code' => $wrong])
            ->assertUnprocessable();
    }

    // Even the right code no longer works.
    $this->withHeaders(spaHeaders())
        ->postJson('/api/v1/auth/otp/verify', ['email' => $user->email, 'code' => $code])
        ->assertUnprocessable();
    $this->assertGuest();
});

it('rejects expired codes', function () {
    $user = User::factory()->create();
    $code = requestOtp($this, $user);

    $this->travel(OtpService::TTL_MINUTES + 1)->minutes();

    $this->withHeaders(spaHeaders())
        ->postJson('/api/v1/auth/otp/verify', ['email' => $user->email, 'code' => $code])
        ->assertUnprocessable();
});

it('invalidates older codes when a new one is issued', function () {
    $user = User::factory()->create();
    $first = requestOtp($this, $user);
    $this->travel(OtpLoginController::RESEND_COOLDOWN + 1)->seconds();
    Notification::fake();
    $second = requestOtp($this, $user);

    if ($first !== $second) {
        $this->withHeaders(spaHeaders())
            ->postJson('/api/v1/auth/otp/verify', ['email' => $user->email, 'code' => $first])
            ->assertUnprocessable();
    }

    $this->withHeaders(spaHeaders())
        ->postJson('/api/v1/auth/otp/verify', ['email' => $user->email, 'code' => $second])
        ->assertOk();
});

it('does not send codes to suspended accounts', function () {
    $user = User::factory()->suspended()->create();

    $this->withHeaders(spaHeaders())->postJson('/api/v1/auth/otp/send', ['email' => $user->email])->assertOk();

    Notification::assertNothingSent();
});
