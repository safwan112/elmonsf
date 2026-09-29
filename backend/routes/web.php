<?php

use Illuminate\Support\Facades\Route;

/*
| The backend is API-only; the React SPA is served separately.
| The root simply identifies the service.
*/
Route::get('/', fn () => response()->json([
    'name' => config('app.name'),
    'api' => url('/api/v1'),
], options: JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
