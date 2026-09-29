<?php

namespace App\Console\Commands;

use App\Enums\EnrollmentStatus;
use App\Models\Enrollment;
use App\Notifications\EnrollmentExpiringNotification;
use Illuminate\Console\Command;

/**
 * Reminds students 7 days and 1 day before their access ends. Each reminder
 * is sent once per enrollment (renewals reset the markers).
 */
class RemindExpiringEnrollments extends Command
{
    protected $signature = 'enrollments:remind-expiring';

    protected $description = 'Notify students whose course access ends soon';

    public function handle(): int
    {
        $sent = 0;
        foreach ([7 => 'reminded_7d_at', 1 => 'reminded_1d_at'] as $days => $column) {
            Enrollment::query()
                ->with(['user', 'course'])
                ->where('status', EnrollmentStatus::Active)
                ->whereNull($column)
                ->whereBetween('expires_at', [now(), now()->addDays($days)])
                ->orderBy('id')
                ->each(function (Enrollment $enrollment) use ($days, $column, &$sent) {
                    // The 7-day reminder is pointless if the 1-day one is due.
                    if ($days === 7 && $enrollment->expires_at->lessThanOrEqualTo(now()->addDay())) {
                        $enrollment->forceFill([$column => now()])->saveQuietly();

                        return;
                    }
                    if ($enrollment->user?->isActive()) {
                        $enrollment->user->notify(new EnrollmentExpiringNotification($enrollment, $days));
                        $sent++;
                    }
                    $enrollment->forceFill([$column => now()])->saveQuietly();
                });
        }

        $this->info("Sent {$sent} reminder(s).");

        return self::SUCCESS;
    }
}
