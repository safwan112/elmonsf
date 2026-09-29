<?php

use App\Enums\RoleName;

it('defines exactly the three platform roles', function () {
    expect(array_map(fn (RoleName $r) => $r->value, RoleName::cases()))
        ->toBe(['admin', 'instructor', 'student']);
});

it('has arabic labels for every role', function () {
    foreach (RoleName::cases() as $role) {
        expect($role->label())->not->toBeEmpty();
    }
});
