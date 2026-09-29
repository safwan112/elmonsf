<?php

use App\Http\Controllers\Api\V1\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\V1\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Auth\EmailVerificationController;
use App\Http\Controllers\Api\V1\Auth\OtpLoginController;
use App\Http\Controllers\Api\V1\Auth\PasswordResetController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\User\ProfileController;
use App\Http\Controllers\Api\V1\User\SecurityController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1
|--------------------------------------------------------------------------
| Every route here is prefixed with /api/v1. Authentication uses Sanctum's
| cookie-based SPA flow: the SPA first calls GET /sanctum/csrf-cookie, then
| sends the XSRF-TOKEN cookie back as the X-XSRF-TOKEN header.
*/

Route::prefix('v1')->name('api.v1.')->middleware('throttle:api')->group(function () {
    Route::get('health', HealthController::class)->name('health');

    // ---- Auth ----------------------------------------------------------
    Route::prefix('auth')->name('auth.')->group(function () {
        Route::middleware('throttle:auth')->group(function () {
            Route::post('register', [AuthController::class, 'register'])->name('register');
            Route::post('login', [AuthController::class, 'login'])->name('login');
            Route::post('reset-password', [PasswordResetController::class, 'reset'])->name('password.reset');
            Route::post('otp/verify', [OtpLoginController::class, 'verify'])->name('otp.verify');
        });

        Route::post('forgot-password', [PasswordResetController::class, 'forgot'])
            ->middleware('throttle:auth-email')
            ->name('password.forgot');
        Route::post('otp/send', [OtpLoginController::class, 'send'])
            ->middleware('throttle:auth-email')
            ->name('otp.send');

        Route::post('email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
            ->middleware('throttle:auth')
            ->whereNumber('id')
            ->where('hash', '[a-f0-9]{40}')
            ->name('verification.verify');

        Route::middleware(['auth:sanctum', 'active'])->group(function () {
            Route::post('email/verification-notification', [EmailVerificationController::class, 'resend'])
                ->middleware('throttle:auth-email')
                ->name('verification.send');
            Route::post('logout', [AuthController::class, 'logout'])->name('logout');
        });
    });

    // ---- Authenticated user ---------------------------------------------
    Route::middleware(['auth:sanctum', 'active'])->prefix('user')->name('user.')->group(function () {
        Route::get('/', [ProfileController::class, 'show'])->name('show');
        Route::patch('profile', [ProfileController::class, 'update'])->name('profile.update');
        Route::patch('email', [ProfileController::class, 'updateEmail'])
            ->middleware('throttle:auth')
            ->name('email.update');
        Route::post('avatar', [ProfileController::class, 'updateAvatar'])
            ->middleware('throttle:uploads')
            ->name('avatar.update');
        Route::delete('avatar', [ProfileController::class, 'destroyAvatar'])->name('avatar.destroy');

        Route::put('password', [SecurityController::class, 'updatePassword'])
            ->middleware('throttle:auth')
            ->name('password.update');
        Route::get('sessions', [SecurityController::class, 'sessions'])->name('sessions.index');
        Route::delete('sessions/{session}', [SecurityController::class, 'revokeSession'])->name('sessions.destroy');
        Route::post('sessions/revoke-others', [SecurityController::class, 'revokeOtherSessions'])
            ->middleware('throttle:auth')
            ->name('sessions.revoke-others');
    });

    // ---- Admin ----------------------------------------------------------
    Route::prefix('admin')
        ->name('admin.')
        ->middleware(['auth:sanctum', 'active', 'role:admin'])
        ->group(function () {
            Route::get('overview', AdminDashboardController::class)->name('overview');
            Route::get('users', [AdminUserController::class, 'index'])->name('users.index');
            Route::get('users/{user}', [AdminUserController::class, 'show'])->name('users.show');
        });
});
