<?php

namespace App\Http\Controllers\Api\V1\User;

use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\User\UpdatePasswordRequest;
use App\Models\User;
use App\Notifications\SecurityAlertNotification;
use App\Services\AuditLogger;
use App\Services\SessionManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SecurityController extends Controller
{
    public function __construct(
        private readonly SessionManager $sessions,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Change the password, then sign out every other device.
     */
    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $user->forceFill(['password' => $request->validated('password')])->save();

        $revoked = $this->sessions->logoutOtherSessions($request, $user);

        $this->audit->log('auth.password_changed', $user, ['sessions_revoked' => $revoked]);
        $user->notify(SecurityAlertNotification::passwordChanged());

        return response()->json(['message' => __('api.password_changed')]);
    }

    public function sessions(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->sessions->list($request, $request->user()),
            'meta' => ['supported' => $this->sessions->supported()],
        ]);
    }

    public function revokeSession(Request $request, string $session): JsonResponse
    {
        if (! preg_match('/^[a-f0-9]{64}$/', $session) || ! $this->sessions->revoke($request, $request->user(), $session)) {
            throw new DomainException(__('api.not_found'), 'not_found', 404);
        }

        return response()->json(['message' => __('api.session_revoked')]);
    }

    public function revokeOtherSessions(Request $request): JsonResponse
    {
        $request->validate(['password' => ['required', 'string', 'current_password:web']]);

        /** @var User $user */
        $user = $request->user();
        $count = $this->sessions->logoutOtherSessions($request, $user);
        $this->audit->log('auth.other_sessions_revoked', $user, ['count' => $count]);

        return response()->json([
            'message' => __('api.other_sessions_revoked'),
            'data' => ['revoked' => $count],
        ]);
    }
}
