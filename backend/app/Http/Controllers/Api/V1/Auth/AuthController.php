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
use App\Notifications\WelcomeNotification;
use App\Services\AuditLogger;
use App\Services\SessionManager;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /** Hash of a random string, used only to equalise login timing. */
    private static ?string $dummyHash = null;

    public function __construct(
        private readonly SessionManager $sessions,
        private readonly AuditLogger $audit,
    ) {}

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

        // Sends the verification email (queued).
        event(new Registered($user));
        $user->notify(new WelcomeNotification);
        $this->audit->log('auth.registered', $user, actor: $user);

        $this->sessions->start($request, $user, remember: false, method: 'register');

        return (new UserResource($user->load('roles')))
            ->additional(['message' => __('api.registered')])
            ->response()
            ->setStatusCode(201);
    }

    public function login(LoginRequest $request): UserResource
    {
        $this->ensureSession($request);

        /** @var User|null $user */
        $user = User::query()->where('email', $request->validated('email'))->first();

        if (! $user) {
            // Spend the same hashing time as a real check so response timing
            // does not reveal whether the email is registered.
            self::$dummyHash ??= Hash::make(Str::random(40));
            Hash::check($request->validated('password'), self::$dummyHash);
        }

        if (! $user || ! Auth::guard('web')->validate($request->only('email', 'password'))) {
            Log::notice('auth.login_failed', ['ip' => $request->ip()]);

            throw ValidationException::withMessages(['email' => __('auth.failed')]);
        }

        if (! $user->isActive()) {
            Log::notice('auth.login_blocked_suspended', ['user_id' => $user->id]);

            throw ValidationException::withMessages(['email' => __('api.account_suspended')]);
        }

        $this->sessions->start($request, $user, $request->boolean('remember'), 'password');

        return (new UserResource($user->load('roles')))
            ->additional(['message' => __('api.logged_in')]);
    }

    public function logout(Request $request): JsonResponse
    {
        if ($user = $request->user()) {
            $this->audit->log('auth.logout', $user);
        }

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
