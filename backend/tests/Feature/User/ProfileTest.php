<?php

use App\Models\AuditLog;
use App\Models\User;
use App\Notifications\SecurityAlertNotification;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Http\UploadedFile;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

it('requires authentication for profile endpoints', function (string $method, string $uri) {
    $this->json($method, $uri)->assertUnauthorized();
})->with([
    ['GET', '/api/v1/user'],
    ['PATCH', '/api/v1/user/profile'],
    ['PATCH', '/api/v1/user/email'],
    ['POST', '/api/v1/user/avatar'],
    ['PUT', '/api/v1/user/password'],
    ['GET', '/api/v1/user/sessions'],
]);

it('updates name, phone and locale', function () {
    $user = User::factory()->student()->create();

    $this->actingAs($user)
        ->patchJson('/api/v1/user/profile', ['name' => '  <b>نورة</b> السبيعي ', 'phone' => '+966 55 000 1111', 'locale' => 'en'])
        ->assertOk()
        ->assertJsonPath('data.name', 'نورة السبيعي')
        ->assertJsonPath('data.phone', '+966550001111')
        ->assertJsonPath('data.locale', 'en')
        ->assertJsonPath('message', 'تم حفظ بياناتك.');

    expect(AuditLog::where('action', 'profile.updated')->first()?->metadata)->toBe(['fields' => ['name', 'phone', 'locale']]);
});

it('allows clearing the phone number', function () {
    $user = User::factory()->create(['phone' => '+966500000001']);

    $this->actingAs($user)->patchJson('/api/v1/user/profile', ['phone' => ''])->assertOk()->assertJsonPath('data.phone', null);
});

it('validates profile updates', function () {
    User::factory()->create(['phone' => '+966500000001']);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patchJson('/api/v1/user/profile', ['name' => '', 'phone' => '+966500000001', 'locale' => 'fr'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name', 'phone', 'locale']);
});

it('ignores protected attributes in profile updates', function () {
    $user = User::factory()->student()->create();

    $this->actingAs($user)
        ->patchJson('/api/v1/user/profile', ['name' => 'اسم', 'status' => 'suspended', 'email' => 'x@evil.test', 'roles' => ['admin']])
        ->assertOk();

    $user->refresh()->load('roles');
    expect($user->isActive())->toBeTrue()
        ->and($user->email)->not->toBe('x@evil.test')
        ->and($user->isAdmin())->toBeFalse();
});

it('changes the email only with the current password, then requires re-verification', function () {
    Notification::fake();
    $user = User::factory()->create(['email' => 'old@example.com']);

    $this->actingAs($user)
        ->patchJson('/api/v1/user/email', ['email' => 'new@example.com', 'current_password' => 'wrong'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['current_password']);

    $this->actingAs($user)
        ->patchJson('/api/v1/user/email', ['email' => 'New@Example.com', 'current_password' => 'password'])
        ->assertOk()
        ->assertJsonPath('data.email', 'new@example.com')
        ->assertJsonPath('data.email_verified', false);

    Notification::assertSentTo($user, VerifyEmailNotification::class);
    Notification::assertSentTo(
        new AnonymousNotifiable,
        SecurityAlertNotification::class,
        fn ($n, $channels, $notifiable) => $notifiable->routes['mail'] === 'old@example.com',
    );
});

it('rejects an email that belongs to another account', function () {
    User::factory()->create(['email' => 'taken@example.com']);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patchJson('/api/v1/user/email', ['email' => 'taken@example.com', 'current_password' => 'password'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

it('uploads an avatar, re-encoding it as a square webp', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/api/v1/user/avatar', ['avatar' => UploadedFile::fake()->image('me.jpg', 640, 480)], ['Accept' => 'application/json'])
        ->assertOk()
        ->assertJsonPath('message', 'تم تحديث الصورة الشخصية.');

    $path = $user->fresh()->avatar_path;
    expect($path)->toEndWith('.webp');
    Storage::disk('public')->assertExists($path);

    [$width, $height, $type] = getimagesizefromstring(Storage::disk('public')->get($path));
    expect([$width, $height, $type])->toBe([256, 256, IMAGETYPE_WEBP]);
});

it('replaces and deletes the previous avatar file', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    $this->actingAs($user)->post('/api/v1/user/avatar', ['avatar' => UploadedFile::fake()->image('a.png', 200, 200)], ['Accept' => 'application/json'])->assertOk();
    $first = $user->fresh()->avatar_path;
    $this->actingAs($user)->post('/api/v1/user/avatar', ['avatar' => UploadedFile::fake()->image('b.png', 200, 200)], ['Accept' => 'application/json'])->assertOk();

    Storage::disk('public')->assertMissing($first);

    $this->actingAs($user)->deleteJson('/api/v1/user/avatar')->assertOk()->assertJsonPath('data.avatar_url', null);
    expect(Storage::disk('public')->allFiles())->toBe([]);
});

it('rejects non-image and oversized avatar uploads', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/api/v1/user/avatar', ['avatar' => UploadedFile::fake()->create('evil.php', 10, 'application/x-php')], ['Accept' => 'application/json'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['avatar']);

    $this->actingAs($user)
        ->post('/api/v1/user/avatar', ['avatar' => UploadedFile::fake()->image('big.jpg', 300, 300)->size(5000)], ['Accept' => 'application/json'])
        ->assertUnprocessable();

    $this->actingAs($user)
        ->post('/api/v1/user/avatar', ['avatar' => UploadedFile::fake()->image('tiny.jpg', 10, 10)], ['Accept' => 'application/json'])
        ->assertUnprocessable();

    expect(Storage::disk('public')->allFiles())->toBe([]);
});
