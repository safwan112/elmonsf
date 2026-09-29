<?php

use App\Http\Controllers\Api\V1\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\V1\Admin\OrderController as AdminOrderController;
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
use App\Http\Controllers\Api\V1\Commerce\CartController;
use App\Http\Controllers\Api\V1\Commerce\CheckoutController;
use App\Http\Controllers\Api\V1\Commerce\MyFatoorahController;
use App\Http\Controllers\Api\V1\Commerce\OrderController;
use App\Http\Controllers\Api\V1\Content\ContactController;
use App\Http\Controllers\Api\V1\Content\FaqController;
use App\Http\Controllers\Api\V1\Content\NewsletterController;
use App\Http\Controllers\Api\V1\Content\PageController;
use App\Http\Controllers\Api\V1\Content\PostController;
use App\Http\Controllers\Api\V1\Content\SettingsController;
use App\Http\Controllers\Api\V1\Content\TestimonialController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\Learning\AttemptController;
use App\Http\Controllers\Api\V1\Learning\ExamController;
use App\Http\Controllers\Api\V1\Learning\LearningController;
use App\Http\Controllers\Api\V1\Learning\QuestionBankController;
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

    // ---- Commerce ------------------------------------------------------
    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::get('cart', [CartController::class, 'show'])->name('cart.show');
        Route::post('cart/items', [CartController::class, 'add'])->name('cart.items.store');
        Route::delete('cart/items/{item}', [CartController::class, 'remove'])->whereNumber('item')->name('cart.items.destroy');
        Route::post('cart/coupon', [CartController::class, 'applyCoupon'])->middleware('throttle:coupon')->name('cart.coupon.store');
        Route::delete('cart/coupon', [CartController::class, 'removeCoupon'])->name('cart.coupon.destroy');

        Route::get('orders', [OrderController::class, 'index'])->name('orders.index');
        Route::get('orders/{order}', [OrderController::class, 'show'])->name('orders.show');
        Route::post('orders/{order}/cancel', [OrderController::class, 'cancel'])->name('orders.cancel');
        Route::get('invoices', [OrderController::class, 'invoices'])->name('invoices.index');
        Route::get('invoices/{invoice}', [OrderController::class, 'invoice'])->name('invoices.show');
        Route::get('enrollments', [OrderController::class, 'enrollments'])->name('enrollments.index');

        // Paying requires a confirmed email address.
        Route::middleware('verified')->group(function () {
            Route::post('checkout', [CheckoutController::class, 'store'])->middleware('throttle:checkout')->name('checkout');
            Route::post('payments/myfatoorah/create', [MyFatoorahController::class, 'create'])
                ->middleware('throttle:checkout')
                ->name('payments.myfatoorah.create');
        });
    });

    // ---- Learning --------------------------------------------------------
    // Access is enforced per item (enrollment / entitlement) by policies.
    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::get('learning/courses/{course}', [LearningController::class, 'course'])->whereNumber('course')->name('learning.courses.show');
        Route::get('learning/lessons/{lesson}', [LearningController::class, 'lesson'])->whereNumber('lesson')->name('learning.lessons.show');
        Route::post('learning/lessons/{lesson}/progress', [LearningController::class, 'updateProgress'])->whereNumber('lesson')->name('learning.lessons.progress');
        Route::get('learning/attachments/{attachment}', [LearningController::class, 'attachment'])->whereNumber('attachment')->name('learning.attachments.download');

        Route::get('exams', [ExamController::class, 'index'])->name('exams.index');
        Route::get('exams/{exam}', [ExamController::class, 'show'])->whereNumber('exam')->name('exams.show');
        Route::post('exams/{exam}/attempts', [ExamController::class, 'start'])->whereNumber('exam')->middleware('throttle:exam-start')->name('exams.attempts.store');
        Route::get('attempts/{attempt}', [AttemptController::class, 'show'])->whereNumber('attempt')->name('attempts.show');
        Route::put('attempts/{attempt}/answers', [AttemptController::class, 'answer'])->whereNumber('attempt')->name('attempts.answers.update');
        Route::post('attempts/{attempt}/submit', [AttemptController::class, 'submit'])->whereNumber('attempt')->name('attempts.submit');

        Route::get('question-banks', [QuestionBankController::class, 'index'])->name('question-banks.index');
        Route::get('question-banks/{bank}', [QuestionBankController::class, 'show'])->whereNumber('bank')->name('question-banks.show');
        Route::get('question-banks/{bank}/questions', [QuestionBankController::class, 'questions'])->whereNumber('bank')->name('question-banks.questions');
        Route::post('question-banks/{bank}/questions/{question}/answer', [QuestionBankController::class, 'answer'])
            ->whereNumber(['bank', 'question'])
            ->middleware('throttle:practice')
            ->name('question-banks.answer');
    });

    // Customer redirect back from MyFatoorah, and signed server webhook.
    Route::get('payments/myfatoorah/callback', [MyFatoorahController::class, 'callback'])->name('payments.myfatoorah.callback');
    Route::post('payments/myfatoorah/webhook', [MyFatoorahController::class, 'webhook'])
        ->withoutMiddleware('throttle:api')
        ->middleware('throttle:webhooks')
        ->name('payments.myfatoorah.webhook');

    // ---- Admin ----------------------------------------------------------
    Route::prefix('admin')
        ->name('admin.')
        ->middleware(['auth:sanctum', 'active', 'role:admin'])
        ->group(function () {
            Route::get('overview', AdminDashboardController::class)->name('overview');
            Route::get('users', [AdminUserController::class, 'index'])->name('users.index');
            Route::get('users/{user}', [AdminUserController::class, 'show'])->name('users.show');
            Route::get('orders', [AdminOrderController::class, 'index'])->name('orders.index');
            Route::get('orders/{order}', [AdminOrderController::class, 'show'])->name('orders.show');
            Route::post('orders/{order}/refund', [AdminOrderController::class, 'refund'])->name('orders.refund');
        });
});
