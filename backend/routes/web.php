<?php

use App\Http\Controllers\Web\SitemapController;
use App\Http\Controllers\Web\SpaController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/sitemap.xml', SitemapController::class)->name('sitemap');

/*
| Site routes. In production (a built frontend/dist/index.html exists),
| Laravel serves the SPA shell with per-page SEO tags; nginx serves the
| hashed /assets files directly. In development the SPA runs on Vite and
| the root just identifies the API.
*/
Route::get('/', function (Request $request) {
    if (is_file((string) config('platform.spa.index'))) {
        return app(SpaController::class)($request);
    }

    return response()->json([
        'name' => config('app.name'),
        'api' => url('/api/v1'),
    ], options: JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
});

Route::get('/{path}', SpaController::class)
    ->where('path', '^(?!api/|api$|sanctum/|storage/|assets/|up$|__myfatoorah-sim|robots\.txt$|favicon).+$')
    ->name('spa');
