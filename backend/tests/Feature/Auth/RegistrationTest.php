<?php

use App\Enums\RoleName;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\Event;

function validRegistration(array $overrides = []): array
{
    return array_merge([
        'name' => 'نورة العتيبي',
        'email' => 'Noura@Example.com',
        'phone' => '+966 50 123 4567',
        'password' => 'Secret123',
        'password_confirmation' => 'Secret123',
    ], $overrides);
}

it('registers a student and starts an authenticated session', function () {
    Event::fake([Registered::class]);

    $this->withHeaders(spaHeaders())
        ->postJson('/api/v1/auth/register', validRegistration())
        ->assertCreated()
        ->assertJsonPath('data.email', 'noura@example.com')
        ->assertJsonPath('data.phone', '+966501234567')
        ->assertJsonPath('data.roles', ['student'])
        ->assertJsonPath('message', 'تم إنشاء حسابك بنجاح.')
        ->assertJsonMissingPath('data.password');

    $user = User::where('email', 'noura@example.com')->firstOrFail();
    expect($user->hasRole(RoleName::Student))->toBeTrue()
        ->and($user->isAdmin())->toBeFalse();

    $this->assertAuthenticatedAs($user);
    Event::assertDispatched(Registered::class);
});

it('ignores attempts to self-assign privileged attributes', function () {
    $this->withHeaders(spaHeaders())
        ->postJson('/api/v1/auth/register', validRegistration([
            'role' => 'admin',
            'roles' => ['admin'],
            'status' => 'active',
            'email_verified_at' => now()->toIso8601String(),
        ]))
        ->assertCreated()
        ->assertJsonPath('data.roles', ['student'])
        ->assertJsonPath('data.email_verified', false);
});

it('validates registration input with arabic messages', function () {
    $this->withHeaders(spaHeaders())
        ->postJson('/api/v1/auth/register', [
            'name' => '',
            'email' => 'not-an-email',
            'password' => 'short',
            'password_confirmation' => 'different',
        ])
        ->assertUnprocessable()
        ->assertJsonPath('code', 'validation_failed')
        ->assertJsonValidationErrors(['name', 'email', 'password'])
        ->assertJsonPath('errors.name.0', 'حقل الاسم مطلوب.');
});

it('rejects duplicate emails case-insensitively', function () {
    User::factory()->create(['email' => 'noura@example.com']);

    $this->withHeaders(spaHeaders())
        ->postJson('/api/v1/auth/register', validRegistration(['email' => 'NOURA@example.com']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

it('requires the request to come from the SPA', function () {
    $this->postJson('/api/v1/auth/register', validRegistration())
        ->assertStatus(400)
        ->assertJsonPath('code', 'stateful_request_required');

    expect(User::count())->toBe(0);
});
