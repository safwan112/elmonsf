<?php

namespace App\Providers;

use App\Models\User;
use App\Policies\UserPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Catch N+1 queries, silently discarded attributes and missing
        // attribute access during development and tests.
        Model::shouldBeStrict(! $this->app->isProduction());

        Password::defaults(fn () => $this->app->isProduction()
            ? Password::min(8)->letters()->numbers()->uncompromised()
            : Password::min(8)->letters()->numbers());

        Gate::policy(User::class, UserPolicy::class);

        $this->configureRateLimiting();
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(120)
            ->by($request->user()?->id ?: $request->ip()));

        // Brute-force protection on credential endpoints: per email+IP and per IP.
        RateLimiter::for('auth', function (Request $request) {
            $email = Str::lower((string) $request->input('email'));

            return [
                Limit::perMinute(config('platform.auth_throttle.per_email_ip'))->by('auth:'.$email.'|'.$request->ip()),
                Limit::perMinute(config('platform.auth_throttle.per_ip'))->by('auth-ip:'.$request->ip()),
            ];
        });

        // Endpoints that send email (reset links, codes, verification): cap
        // per IP and per target address to prevent mail bombing.
        RateLimiter::for('auth-email', function (Request $request) {
            $email = Str::lower((string) ($request->input('email') ?? $request->user()?->email));

            return [
                Limit::perHour(config('platform.auth_throttle.emails_per_hour'))->by('mail-to:'.$email),
                Limit::perMinute(config('platform.auth_throttle.per_ip'))->by('mail-ip:'.$request->ip()),
            ];
        });

        // Public forms (contact, newsletter): stop spam floods per IP.
        RateLimiter::for('contact', fn (Request $request) => Limit::perHour(config('platform.contact_per_hour'))
            ->by('contact:'.$request->ip()));

        RateLimiter::for('search', fn (Request $request) => Limit::perMinute(60)
            ->by('search:'.($request->user()?->id ?: $request->ip())));

        RateLimiter::for('uploads', fn (Request $request) => Limit::perMinute(10)
            ->by('upload:'.($request->user()?->id ?: $request->ip())));
    }
}
