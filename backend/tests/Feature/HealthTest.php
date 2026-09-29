<?php

it('reports healthy status with database connectivity', function () {
    $this->getJson('/api/v1/health')
        ->assertOk()
        ->assertJsonPath('data.status', 'ok')
        ->assertJsonPath('data.database', 'ok');
});

it('sends security headers on api responses', function () {
    $this->getJson('/api/v1/health')
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('X-Frame-Options', 'DENY')
        ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
        ->assertHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
});

it('returns the standard error envelope for unknown endpoints', function () {
    $this->getJson('/api/v1/does-not-exist')
        ->assertNotFound()
        ->assertExactJson([
            'message' => 'العنصر المطلوب غير موجود.',
            'code' => 'not_found',
        ]);
});

it('localizes messages to English when requested', function () {
    $this->getJson('/api/v1/does-not-exist', ['Accept-Language' => 'en'])
        ->assertNotFound()
        ->assertJsonPath('message', 'The requested resource was not found.')
        ->assertHeader('Content-Language', 'en');
});

it('returns JSON even when the client does not ask for it', function () {
    $this->get('/api/v1/user')
        ->assertUnauthorized()
        ->assertJsonPath('code', 'unauthenticated');
});

it('allows credentialed CORS requests only from the SPA origin', function () {
    $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->getJson('/api/v1/health')
        ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173')
        ->assertHeader('Access-Control-Allow-Credentials', 'true');

    $response = $this->withHeaders(['Origin' => 'https://evil.example'])->getJson('/api/v1/health');
    expect($response->headers->get('Access-Control-Allow-Origin'))->not->toBe('https://evil.example');
});
