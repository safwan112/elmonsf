<?php

namespace App\Services;

use App\Models\User;
use App\Support\UserAgent;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Starts authenticated sessions and manages a user's other browser sessions.
 *
 * Session ids are the value of the session cookie, so they are never sent to
 * the client: sessions are exposed by an opaque SHA-256 key instead.
 */
class SessionManager
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * Log the user in on the web guard, rotate the session id (prevents
     * session fixation) and record the login.
     */
    public function start(Request $request, User $user, bool $remember, string $method): void
    {
        Auth::guard('web')->login($user, $remember);
        $request->session()->regenerate();

        $user->forceFill(['last_login_at' => now()])->save();

        $this->audit->log('auth.login', $user, ['method' => $method], $user);
    }

    public function supported(): bool
    {
        return config('session.driver') === 'database';
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function list(Request $request, User $user): Collection
    {
        if (! $this->supported()) {
            return collect();
        }

        $currentId = $request->hasSession() ? $request->session()->getId() : null;

        return $this->table()
            ->where('user_id', $user->getKey())
            ->orderByDesc('last_activity')
            ->get(['id', 'ip_address', 'user_agent', 'last_activity'])
            ->map(function (object $row) use ($currentId) {
                $agent = UserAgent::parse($row->user_agent);

                return [
                    'id' => self::publicId($row->id),
                    'ip_address' => $row->ip_address,
                    'browser' => $agent->browser(),
                    'platform' => $agent->platform(),
                    'is_mobile' => $agent->isMobile(),
                    'is_current' => $row->id === $currentId,
                    'last_active_at' => Carbon::createFromTimestamp($row->last_activity)->toIso8601String(),
                ];
            })
            ->values();
    }

    /**
     * Revoke one of the user's sessions by its public id. The current session
     * cannot be revoked here (that is what logout is for).
     */
    public function revoke(Request $request, User $user, string $publicId): bool
    {
        if (! $this->supported()) {
            return false;
        }

        $currentId = $request->hasSession() ? $request->session()->getId() : null;

        $target = $this->table()
            ->where('user_id', $user->getKey())
            ->pluck('id')
            ->first(fn (string $id) => hash_equals(self::publicId($id), $publicId) && $id !== $currentId);

        if (! $target) {
            return false;
        }

        $this->table()->where('id', $target)->delete();
        $this->audit->log('auth.session_revoked', $user);

        return true;
    }

    /**
     * Sign the user out everywhere except this request's session. Rotating
     * the remember token also kills "remember me" cookies on other devices;
     * the current device gets a fresh one if it had one.
     */
    public function logoutOtherSessions(Request $request, User $user): int
    {
        $guard = Auth::guard('web');
        $hadRememberCookie = $request->cookies->has($guard->getRecallerName());

        $user->setRememberToken(null);
        $user->save(); // remember token is re-issued below if needed

        $deleted = 0;
        if ($this->supported()) {
            $currentId = $request->hasSession() ? $request->session()->getId() : null;
            $deleted = $this->table()
                ->where('user_id', $user->getKey())
                ->when($currentId, fn ($q) => $q->where('id', '!=', $currentId))
                ->delete();
        }

        if ($request->hasSession() && $guard->check()) {
            $guard->login($user, $hadRememberCookie);
            $request->session()->regenerate(destroy: true);
        }

        return $deleted;
    }

    /**
     * Destroy every session of a user (e.g. after a password reset).
     */
    public function logoutAllSessions(User $user): void
    {
        $user->setRememberToken(null);
        $user->save();

        if ($this->supported()) {
            $this->table()->where('user_id', $user->getKey())->delete();
        }
    }

    public static function publicId(string $sessionId): string
    {
        return hash('sha256', $sessionId);
    }

    private function table()
    {
        return DB::connection(config('session.connection'))->table(config('session.table', 'sessions'));
    }
}
