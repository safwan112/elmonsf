<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Models\User;
use App\Notifications\SecurityAlertNotification;
use App\Services\AuditLogger;
use App\Services\SessionManager;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    public function __construct(
        private readonly SessionManager $sessions,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Always answers the same way, whether or not the email exists, so the
     * endpoint cannot be used to discover registered accounts.
     */
    public function forgot(ForgotPasswordRequest $request): JsonResponse
    {
        $status = Password::broker()->sendResetLink($request->only('email'));

        if ($status !== Password::RESET_LINK_SENT) {
            Log::info('auth.password_reset_link_not_sent', ['status' => $status]);
        }

        return response()->json(['message' => __('passwords.user')]);
    }

    public function reset(ResetPasswordRequest $request): JsonResponse
    {
        $resetUser = null;

        $status = Password::broker()->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) use (&$resetUser) {
                $user->forceFill(['password' => $password]);
                // Proving control of the inbox also confirms the address.
                if (! $user->hasVerifiedEmail()) {
                    $user->email_verified_at = now();
                }
                $user->save();

                $this->sessions->logoutAllSessions($user);
                event(new PasswordReset($user));
                $resetUser = $user;
            },
        );

        if ($status !== Password::PASSWORD_RESET || ! $resetUser) {
            throw ValidationException::withMessages(['email' => __('passwords.token')]);
        }

        $this->audit->log('auth.password_reset', $resetUser, actor: $resetUser);
        $resetUser->notify(SecurityAlertNotification::passwordReset());

        return response()->json(['message' => __('passwords.reset')]);
    }
}
