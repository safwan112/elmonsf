<?php

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

// Reconcile and cancel orders left unpaid.
Schedule::command('orders:cancel-stale')->hourly()->onOneServer();
