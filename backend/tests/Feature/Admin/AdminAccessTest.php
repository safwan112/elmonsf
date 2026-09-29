<?php

use App\Models\User;

dataset('non-admins', [
    'student' => fn () => User::factory()->student()->create(),
    'instructor' => fn () => User::factory()->instructor()->create(),
]);

it('denies guests access to admin endpoints', function (string $uri) {
    $this->getJson($uri)->assertUnauthorized();
})->with(['/api/v1/admin/overview', '/api/v1/admin/users']);

it('denies non-admin roles access to admin endpoints', function (User $user) {
    $this->actingAs($user)->getJson('/api/v1/admin/overview')->assertForbidden()->assertJsonPath('code', 'forbidden');
    $this->actingAs($user)->getJson('/api/v1/admin/users')->assertForbidden();
    $this->actingAs($user)->getJson("/api/v1/admin/users/{$user->id}")->assertForbidden();
})->with('non-admins');

it('gives admins the dashboard overview', function () {
    $admin = User::factory()->admin()->create();
    User::factory()->count(3)->student()->create();
    User::factory()->instructor()->create();
    User::factory()->student()->suspended()->create();

    $this->actingAs($admin)
        ->getJson('/api/v1/admin/overview')
        ->assertOk()
        ->assertJsonPath('data.users.total', 6)
        ->assertJsonPath('data.users.active', 5)
        ->assertJsonPath('data.users.by_role.student', 4)
        ->assertJsonPath('data.users.by_role.instructor', 1)
        ->assertJsonPath('data.users.by_role.admin', 1);
});

it('lists users with pagination, search and role filters', function () {
    $admin = User::factory()->admin()->create(['name' => 'Admin']);
    User::factory()->student()->create(['name' => 'خالد المطيري', 'email' => 'khalid@example.com']);
    // Deterministic filler names: random Arabic names could contain "خالد".
    User::factory()->count(20)->student()->sequence(fn ($seq) => [
        'name' => 'طالب رقم '.$seq->index,
        'email' => "filler{$seq->index}@example.test",
    ])->create();
    User::factory()->instructor()->create(['name' => 'Instructor One']);

    $this->actingAs($admin)
        ->getJson('/api/v1/admin/users?per_page=10')
        ->assertOk()
        ->assertJsonCount(10, 'data')
        ->assertJsonPath('meta.total', 23)
        ->assertJsonPath('meta.per_page', 10)
        ->assertJsonStructure(['data' => [['id', 'name', 'email', 'roles', 'status']], 'links', 'meta']);

    $this->actingAs($admin)
        ->getJson('/api/v1/admin/users?search=خالد')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.email', 'khalid@example.com');

    $this->actingAs($admin)
        ->getJson('/api/v1/admin/users?role=instructor')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Instructor One');
});

it('validates admin list filters', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->getJson('/api/v1/admin/users?role=superuser&sort=password&per_page=1000')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['role', 'sort', 'per_page']);
});

it('treats search input literally', function () {
    $admin = User::factory()->admin()->create(['name' => 'Admin']);
    User::factory()->student()->create(['name' => 'Someone']);

    $this->actingAs($admin)
        ->getJson('/api/v1/admin/users?search='.urlencode('%'))
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('shows a single user to admins', function () {
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create();

    $this->actingAs($admin)
        ->getJson("/api/v1/admin/users/{$student->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $student->id);

    $this->actingAs($admin)->getJson('/api/v1/admin/users/999999')->assertNotFound();
});
