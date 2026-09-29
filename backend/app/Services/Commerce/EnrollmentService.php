<?php

namespace App\Services\Commerce;

use App\Enums\EnrollmentStatus;
use App\Models\Enrollment;
use App\Models\Order;

class EnrollmentService
{
    /**
     * Grant (or extend) access to a course. There is exactly one enrollment
     * row per user and course (unique index); buying again extends access
     * from the later of "now" and the current expiry. Call inside a
     * transaction.
     */
    public function grant(int $userId, int $courseId, ?int $durationDays, ?int $planId, ?Order $order, string $source = 'purchase'): Enrollment
    {
        /** @var Enrollment|null $enrollment */
        $enrollment = Enrollment::query()
            ->where('user_id', $userId)
            ->where('course_id', $courseId)
            ->lockForUpdate()
            ->first();

        $now = now();

        if (! $enrollment) {
            return Enrollment::query()->create([
                'user_id' => $userId,
                'course_id' => $courseId,
                'order_id' => $order?->id,
                'course_plan_id' => $planId,
                'source' => $source,
                'status' => EnrollmentStatus::Active,
                'starts_at' => $now,
                'expires_at' => $durationDays === null ? null : $now->copy()->addDays($durationDays),
            ]);
        }

        $stillCurrent = $enrollment->isCurrent();
        $base = $stillCurrent && $enrollment->expires_at ? $enrollment->expires_at : $now;

        $expiresAt = match (true) {
            $durationDays === null => null, // lifetime access
            $stillCurrent && $enrollment->expires_at === null => null, // already lifetime
            default => $base->copy()->addDays($durationDays),
        };

        $enrollment->forceFill([
            'order_id' => $order?->id ?? $enrollment->order_id,
            'course_plan_id' => $planId ?? $enrollment->course_plan_id,
            'source' => $source,
            'status' => EnrollmentStatus::Active,
            'starts_at' => $stillCurrent ? $enrollment->starts_at : $now,
            'expires_at' => $expiresAt,
            'revoked_at' => null,
        ])->save();

        return $enrollment;
    }

    /**
     * Mark enrollments past their expiry as expired. Returns the count.
     */
    public function expireDue(): int
    {
        return Enrollment::query()
            ->where('status', EnrollmentStatus::Active)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->update(['status' => EnrollmentStatus::Expired, 'updated_at' => now()]);
    }
}
