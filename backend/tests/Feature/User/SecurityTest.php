<?php

use App\Models\AuditLog;
use App\Models\User;
use App\Notifications\SecurityAlertNotification;
use App\Services\SessionManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

function insertSession(User $user, string $id, string $agent, int $ago = 0): void
{
    DB::table('sessions')->insert([
        'id' => $id,
        'user_id' => $user->id,
        'ip_address' => '10.0.0.'.rand(1, 250),
        'user_agent' => $agent,
        'payload' => '',
        'last_activity' => time() - $ago,
    ]);
}

const CHROME_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const SAFARI_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

beforeEach(fn () => config(['session.driver' => 'database']));

it('changes the password and alerts the owner', function () {
    Notification::fake();
    $user = User::factory()->create();
    insertSession($user, 'other-device', CHROME_WIN);

    $this->actingAs($user)
        ->putJson('/api/v1/user/password', [
            'current_password' => 'password',
            'password' => 'BrandNew123',
            'password_confirmation' => 'BrandNew123',
        ])
        ->assertOk()
        ->assertJsonPath('message', 'تم تغيير كلمة المرور، وسُجّل خروجك من الأجهزة الأخرى.');

    expect(Hash::check('BrandNew123', $user->fresh()->password))->toBeTrue()
        ->and(DB::table('sessions')->where('id', 'other-device')->exists())->toBeFalse()
        ->and(AuditLog::where('action', 'auth.password_changed')->exists())->toBeTrue();
    Notification::assertSentTo($user, SecurityAlertNotification::class);
});

it('rejects a wrong current password or a reused password', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->putJson('/api/v1/user/password', ['current_password' => 'nope', 'password' => 'BrandNew123', 'password_confirmation' => 'BrandNew123'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['current_password']);

    $this->actingAs($user)
        ->putJson('/api/v1/user/password', ['current_password' => 'password', 'password' => 'password', 'password_confirmation' => 'password'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['password']);
});

it('lists only the user\'s own sessions with device details', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    insertSession($user, 'mine-1', CHROME_WIN, 60);
    insertSession($user, 'mine-2', SAFARI_IOS, 10);
    insertSession($other, 'theirs', CHROME_WIN);

    $response = $this->actingAs($user)->getJson('/api/v1/user/sessions')->assertOk();

    $response->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.supported', true)
        ->assertJsonPath('data.0.browser', 'Safari')
        ->assertJsonPath('data.0.platform', 'iOS')
        ->assertJsonPath('data.0.is_mobile', true)
        ->assertJsonPath('data.1.browser', 'Chrome')
        ->assertJsonPath('data.1.platform', 'Windows');

    // Raw session ids (cookie values) are never exposed.
    expect($response->getContent())->not->toContain('mine-1')->not->toContain('mine-2');
});

it('revokes a single session by its public id', function () {
    $user = User::factory()->create();
    insertSession($user, 'to-revoke', CHROME_WIN);

    $this->actingAs($user)
        ->deleteJson('/api/v1/user/sessions/'.SessionManager::publicId('to-revoke'))
        ->assertOk();

    expect(DB::table('sessions')->where('id', 'to-revoke')->exists())->toBeFalse();
});

it('cannot revoke another user\'s session', function () {
    $user = User::factory()->create();
    $victim = User::factory()->create();
    insertSession($victim, 'victim-session', CHROME_WIN);

    $this->actingAs($user)
        ->deleteJson('/api/v1/user/sessions/'.SessionManager::publicId('victim-session'))
        ->assertNotFound();

    $this->actingAs($user)->deleteJson('/api/v1/user/sessions/not-a-hash')->assertNotFound();

    expect(DB::table('sessions')->where('id', 'victim-session')->exists())->toBeTrue();
});

it('signs out all other sessions after confirming the password', function () {
    $user = User::factory()->create(['remember_token' => 'old-token']);
    insertSession($user, 'a', CHROME_WIN);
    insertSession($user, 'b', SAFARI_IOS);

    $this->actingAs($user)
        ->postJson('/api/v1/user/sessions/revoke-others', ['password' => 'wrong'])
        ->assertUnprocessable();

    $this->actingAs($user)
        ->postJson('/api/v1/user/sessions/revoke-others', ['password' => 'password'])
        ->assertOk()
        ->assertJsonPath('data.revoked', 2);

    expect(DB::table('sessions')->where('user_id', $user->id)->count())->toBe(0)
        ->and($user->fresh()->remember_token)->not->toBe('old-token');
});

it('keeps the current browser signed in when signing out other devices', function () {
    $user = User::factory()->create();

    $this->withHeaders(spaHeaders())
        ->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'password'])
        ->assertOk();

    $this->withHeaders(spaHeaders())
        ->postJson('/api/v1/user/sessions/revoke-others', ['password' => 'password'])
        ->assertOk();

    $this->withHeaders(spaHeaders())->getJson('/api/v1/user')->assertOk();
});
