<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

class EmailVerificationController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * Confirm an email from the signed link. The signature (not a session)
     * proves the request came from the email, so the user need not be
     * signed in on this device.
     */
    public function verify(Request $request, string $id, string $hash): JsonResponse
    {
        if (! URL::hasValidRelativeSignature($request)) {
            throw new DomainException(__('api.verification_link_invalid'), 'invalid_signature', 403);
        }

        $user = User::query()->find($id);

        if (! $user || ! hash_equals(sha1($user->getEmailForVerification()), $hash)) {
            throw new DomainException(__('api.verification_link_invalid'), 'invalid_signature', 403);
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));
            $this->audit->log('auth.email_verified', $user, actor: $user);
        }

        return response()->json([
            'message' => __('api.email_verified'),
            'data' => ['verified' => true],
        ]);
    }

    public function resend(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return (new UserResource($user->load('roles')))
                ->additional(['message' => __('api.email_already_verified')])
                ->response();
        }

        $user->sendEmailVerificationNotification();

        return response()->json(['message' => __('api.verification_sent')], 202);
    }
}
