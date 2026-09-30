<?php

use App\Models\User;

it('hides the cron endpoint when no secret is configured', function () {
    config(['platform.cron_secret' => '']);

    $this->getJson('/api/cron/daily', ['Authorization' => 'Bearer '])->assertNotFound();
});

it('rejects a wrong cron secret', function () {
    config(['platform.cron_secret' => 'right-secret']);

    $this->getJson('/api/cron/daily')->assertNotFound();
    $this->getJson('/api/cron/daily', ['Authorization' => 'Bearer wrong'])->assertNotFound();
});

it('runs the maintenance commands with the right secret', function () {
    config(['platform.cron_secret' => 'right-secret']);

    $this->getJson('/api/cron/daily', ['Authorization' => 'Bearer right-secret'])
        ->assertOk()
        ->assertJsonPath('ran.exams:close-expired', 0)
        ->assertJsonPath('ran.orders:cancel-stale', 0);
});

it('seeds only an empty database', function () {
    $this->artisan('db:seed-if-empty')->assertSuccessful();
    expect(User::query()->where('email', 'admin@example.com')->exists())->toBeTrue();

    $count = User::query()->count();
    $this->artisan('db:seed-if-empty')->expectsOutputToContain('skipping seed')->assertSuccessful();
    expect(User::query()->count())->toBe($count);
});
