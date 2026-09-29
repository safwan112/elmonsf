<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->beforeEach(function () {
        // Reset the MyFatoorah HTTP fake between tests (see fakeMyFatoorah()).
        unset($GLOBALS['mf_faked'], $GLOBALS['mf_scenario']);
    })
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

/**
 * Headers that make Sanctum treat the request as coming from the SPA,
 * so the session (cookie) guard is active.
 *
 * @return array<string, string>
 */
function spaHeaders(): array
{
    return [
        'Origin' => 'http://localhost:5173',
        'Referer' => 'http://localhost:5173/',
        'Accept' => 'application/json',
    ];
}

require_once __DIR__.'/Feature/Commerce/helpers.php';
