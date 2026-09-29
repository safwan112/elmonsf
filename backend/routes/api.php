<?php

use App\Http\Controllers\Api\V1\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\V1\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Auth\EmailVerificationController;
use App\Http\Controllers\Api\V1\Auth\OtpLoginController;
use App\Http\Controllers\Api\V1\Auth\PasswordResetController;
use App\Http\Controllers\Api\V1\Catalog\CategoryController;
use App\Http\Controllers\Api\V1\Catalog\CourseController;
use App\Http\Controllers\Api\V1\Catalog\InstructorController;
use App\Http\Controllers\Api\V1\Catalog\ProductController;
use App\Http\Controllers\Api\V1\Catalog\SearchController;
use App\Http\Controllers\Api\V1\Content\ContactController;
use App\Http\Controllers\Api\V1\Content\FaqController;
use App\Http\Controllers\Api\V1\Content\NewsletterController;
use App\Http\Controllers\Api\V1\Content\PageController;
use App\Http\Controllers\Api\V1\Content\PostController;
use App\Http\Controllers\Api\V1\Content\SettingsController;
use App\Http\Controllers\Api\V1\Content\TestimonialController;
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

    // ---- Public catalog & content -------------------------------------
    Route::get('categories', [CategoryController::class, 'index'])->name('categories.index');
    Route::get('categories/{slug}', [CategoryController::class, 'show'])->name('categories.show');
    Route::get('courses', [CourseController::class, 'index'])->name('courses.index');
    Route::get('courses/{slug}', [CourseController::class, 'show'])->name('courses.show');
    Route::get('courses/{slug}/lessons/{lesson}/preview', [CourseController::class, 'preview'])
        ->whereNumber('lesson')
        ->name('courses.lessons.preview');
    Route::get('products', [ProductController::class, 'index'])->name('products.index');
    Route::get('products/{slug}', [ProductController::class, 'show'])->name('products.show');
    Route::get('instructors', [InstructorController::class, 'index'])->name('instructors.index');
    Route::get('instructors/{slug}', [InstructorController::class, 'show'])->name('instructors.show');
    Route::get('search', SearchController::class)->middleware('throttle:search')->name('search');

    Route::get('posts', [PostController::class, 'index'])->name('posts.index');
    Route::get('posts/{slug}', [PostController::class, 'show'])->name('posts.show');
    Route::get('pages/{slug}', [PageController::class, 'show'])->name('pages.show');
    Route::get('faqs', [FaqController::class, 'index'])->name('faqs.index');
    Route::get('testimonials', [TestimonialController::class, 'index'])->name('testimonials.index');
    Route::get('settings', SettingsController::class)->name('settings');

    Route::post('contact', [ContactController::class, 'store'])->middleware('throttle:contact')->name('contact.store');
    Route::post('newsletter/subscribe', [NewsletterController::class, 'subscribe'])
        ->middleware('throttle:contact')
        ->name('newsletter.subscribe');
    Route::post('newsletter/unsubscribe', [NewsletterController::class, 'unsubscribe'])
        ->middleware('throttle:contact')
        ->name('newsletter.unsubscribe');

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
