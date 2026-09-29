<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Enums\RoleName;
use App\Enums\UserStatus;
use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $this->ensureSession($request);

        $user = DB::transaction(function () use ($request) {
            $user = new User($request->safe()->only(['name', 'email', 'phone', 'password']));
            $user->locale = app()->getLocale();
            $user->forceFill(['status' => UserStatus::Active])->save();
            $user->assignRole(RoleName::Student);

            return $user->refresh();
        });

        event(new Registered($user));

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        Log::info('auth.registered', ['user_id' => $user->id]);

        return (new UserResource($user->load('roles')))
            ->additional(['message' => __('api.registered')])
            ->response()
            ->setStatusCode(201);
    }

    public function login(LoginRequest $request): UserResource
    {
        $this->ensureSession($request);

        $request->authenticate();

        /** @var User $user */
        $user = Auth::guard('web')->user();

        if (! $user->isActive()) {
            Auth::guard('web')->logout();
            Log::notice('auth.login_blocked_suspended', ['user_id' => $user->id]);

            throw ValidationException::withMessages(['email' => __('api.account_suspended')]);
        }

        $request->session()->regenerate();
        $user->forceFill(['last_login_at' => now()])->save();

        Log::info('auth.login', ['user_id' => $user->id, 'ip' => $request->ip()]);

        return (new UserResource($user->load('roles')))
            ->additional(['message' => __('api.logged_in')]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['message' => __('api.logged_out')]);
    }

    /**
     * Session auth only works for requests Sanctum recognises as coming from
     * the SPA (stateful domains). Fail clearly instead of with a 500.
     */
    private function ensureSession(Request $request): void
    {
        if (! $request->hasSession()) {
            throw new DomainException(__('api.stateful_required'), 'stateful_request_required', 400);
        }
    }
}
