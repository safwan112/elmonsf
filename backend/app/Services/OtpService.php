<?php

namespace App\Services;

use App\Enums\OtpPurpose;
use App\Models\OtpCode;
use App\Models\User;
use App\Notifications\OtpCodeNotification;
use Illuminate\Support\Facades\DB;

/**
 * One-time codes delivered out of band (email today; SMS can be added as
 * another notification channel). Codes are stored only as an HMAC, expire
 * quickly, allow a limited number of attempts and can be used once.
 */
class OtpService
{
    public const LENGTH = 6;

    public const TTL_MINUTES = 10;

    public const MAX_ATTEMPTS = 5;

    public function issue(User $user, OtpPurpose $purpose, ?string $ip = null): void
    {
        $code = str_pad((string) random_int(0, 10 ** self::LENGTH - 1), self::LENGTH, '0', STR_PAD_LEFT);

        DB::transaction(function () use ($user, $purpose, $code, $ip) {
            // A new code always invalidates older ones for the same purpose.
            OtpCode::query()
                ->where('user_id', $user->id)
                ->where('purpose', $purpose)
                ->whereNull('consumed_at')
                ->update(['consumed_at' => now()]);

            OtpCode::query()->create([
                'user_id' => $user->id,
                'purpose' => $purpose,
                'code_hash' => $this->hash($code),
                'expires_at' => now()->addMinutes(self::TTL_MINUTES),
                'requested_ip' => $ip,
            ]);
        });

        $user->notify(new OtpCodeNotification($code, $purpose, self::TTL_MINUTES));
    }

    /**
     * Check a code and consume it on success. Row-locked so a code can never
     * be redeemed twice by concurrent requests.
     */
    public function verify(User $user, OtpPurpose $purpose, string $code): bool
    {
        return DB::transaction(function () use ($user, $purpose, $code) {
            /** @var OtpCode|null $otp */
            $otp = OtpCode::query()
                ->where('user_id', $user->id)
                ->where('purpose', $purpose)
                ->active()
                ->latest('id')
                ->lockForUpdate()
                ->first();

            if (! $otp || $otp->attempts >= self::MAX_ATTEMPTS) {
                return false;
            }

            if (! hash_equals($otp->code_hash, $this->hash($code))) {
                $otp->increment('attempts');

                return false;
            }

            $otp->forceFill(['consumed_at' => now()])->save();

            return true;
        });
    }

    private function hash(string $code): string
    {
        return hash_hmac('sha256', $code, (string) config('app.key'));
    }
}
