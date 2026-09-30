<?php

use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

/*
| Scheduled maintenance. Run `php artisan schedule:work` locally, or a cron
| entry calling `php artisan schedule:run` every minute in production.
*/

// Delete expired one-time codes and other prunable records.
Schedule::command('model:prune')->daily()->onOneServer();

// Remove expired password reset tokens.
Schedule::command('auth:clear-resets')->daily()->onOneServer();

// Access periods that ended.
Schedule::command('enrollments:expire')->hourly()->onOneServer();

// Access-ending reminders (7 days and 1 day before), mid-morning Riyadh time.
Schedule::command('enrollments:remind-expiring')->dailyAt('09:00')->timezone('Asia/Riyadh')->onOneServer();

// Grade exam attempts abandoned after their time ran out.
Schedule::command('exams:close-expired')->everyFiveMinutes()->onOneServer();

// Reconcile and cancel orders left unpaid.
Schedule::command('orders:cancel-stale')->hourly()->onOneServer();

// Deploy hook for fresh databases (e.g. each Vercel build): seed only when no
// accounts exist yet, so later deploys never overwrite content edited in admin.
Artisan::command('db:seed-if-empty', function () {
    if (User::query()->exists()) {
        $this->info('Database already has accounts; skipping seed.');

        return;
    }

    $this->call('db:seed', ['--force' => true]);
})->purpose('Seed the database only if it has no users yet');
