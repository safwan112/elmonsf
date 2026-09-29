<?php

namespace Tests;

use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // The SPA always sends its UI language; the Symfony test client would
        // otherwise default to English.
        $this->withHeader('Accept-Language', 'ar');

        if (in_array(RefreshDatabase::class, class_uses_recursive(static::class), true)) {
            Role::ensureDefaults();
        }
    }
}
