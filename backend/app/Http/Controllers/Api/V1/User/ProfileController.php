<?php

namespace App\Http\Controllers\Api\V1\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\UpdateAvatarRequest;
use App\Http\Requests\User\UpdateEmailRequest;
use App\Http\Requests\User\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Notifications\SecurityAlertNotification;
use App\Services\AuditLogger;
use App\Services\AvatarService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class ProfileController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function show(Request $request): UserResource
    {
        return new UserResource($request->user()->load('roles'));
    }

    public function update(UpdateProfileRequest $request): UserResource
    {
        /** @var User $user */
        $user = $request->user();
        $user->fill($request->validated());
        $changed = array_keys($user->getDirty());
        $user->save();

        if ($changed) {
            $this->audit->log('profile.updated', $user, ['fields' => $changed]);
        }

        return (new UserResource($user->load('roles')))->additional(['message' => __('api.profile_updated')]);
    }

    /**
     * Changing the email requires the current password, un-verifies the
     * account until the new address is confirmed, and alerts the old address.
     */
    public function updateEmail(UpdateEmailRequest $request): UserResource
    {
        /** @var User $user */
        $user = $request->user();
        $oldEmail = $user->email;
        $newEmail = $request->validated('email');

        if ($newEmail === $oldEmail) {
            return (new UserResource($user->load('roles')))->additional(['message' => __('api.profile_updated')]);
        }

        DB::transaction(function () use ($user, $newEmail, $oldEmail) {
            $user->forceFill(['email' => $newEmail, 'email_verified_at' => null])->save();
            $this->audit->log('auth.email_changed', $user, ['from' => $oldEmail, 'to' => $newEmail]);
        });

        $user->sendEmailVerificationNotification();
        Notification::route('mail', $oldEmail)->notify(SecurityAlertNotification::emailChanged($newEmail));

        return (new UserResource($user->load('roles')))->additional(['message' => __('api.email_changed')]);
    }

    public function updateAvatar(UpdateAvatarRequest $request, AvatarService $avatars): UserResource
    {
        /** @var User $user */
        $user = $request->user();
        $avatars->store($user, $request->file('avatar'));
        $this->audit->log('profile.avatar_updated', $user);

        return (new UserResource($user->load('roles')))->additional(['message' => __('api.avatar_updated')]);
    }

    public function destroyAvatar(Request $request, AvatarService $avatars): UserResource
    {
        /** @var User $user */
        $user = $request->user();
        $avatars->delete($user);

        return (new UserResource($user->load('roles')))->additional(['message' => __('api.avatar_removed')]);
    }
}
