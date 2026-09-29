<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Enums\OtpPurpose;
use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\SendOtpRequest;
use App\Http\Requests\Auth\VerifyOtpRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\OtpService;
use App\Services\SessionManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * Passwordless sign-in with a one-time code sent to the user's email.
 */
class OtpLoginController extends Controller
{
    /** Minimum seconds between two codes for the same email. */
    public const RESEND_COOLDOWN = 60;

    public function __construct(
        private readonly OtpService $otp,
        private readonly SessionManager $sessions,
    ) {}

    public function send(SendOtpRequest $request): JsonResponse
    {
        $email = $request->validated('email');
        $key = 'otp-send:'.sha1($email);

        // Cooldown applies to every email (existing or not) so response
        // behaviour never reveals whether an account exists.
        if (RateLimiter::tooManyAttempts($key, 1)) {
            throw ValidationException::withMessages([
                'email' => __('api.otp_cooldown', ['seconds' => RateLimiter::availableIn($key)]),
            ]);
        }
        RateLimiter::hit($key, self::RESEND_COOLDOWN);

        $user = User::query()->where('email', $email)->first();
        if ($user?->isActive()) {
            $this->otp->issue($user, OtpPurpose::Login, $request->ip());
        }

        return response()->json([
            'message' => __('api.otp_sent'),
            'data' => ['resend_after' => self::RESEND_COOLDOWN, 'length' => OtpService::LENGTH],
        ]);
    }

    public function verify(VerifyOtpRequest $request): UserResource
    {
        if (! $request->hasSession()) {
            throw new DomainException(__('api.stateful_required'), 'stateful_request_required', 400);
        }

        $user = User::query()->where('email', $request->validated('email'))->first();

        if (! $user || ! $this->otp->verify($user, OtpPurpose::Login, $request->validated('code'))) {
            throw ValidationException::withMessages(['code' => __('api.otp_invalid')]);
        }

        if (! $user->isActive()) {
            throw ValidationException::withMessages(['code' => __('api.account_suspended')]);
        }

        // Receiving the code proves ownership of the address.
        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        $this->sessions->start($request, $user, $request->boolean('remember'), 'otp');

        return (new UserResource($user->load('roles')))->additional(['message' => __('api.logged_in')]);
    }
}
