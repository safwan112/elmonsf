<?php

return [

    /*
    | Public URL of the React SPA. Used for CORS, password reset / verification
    | links and payment redirect URLs.
    */
    'frontend_url' => rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/'),

    /*
    | Accounts created by `php artisan db:seed`.
    */
    'seed' => [
        'admin_name' => env('SEED_ADMIN_NAME', 'مدير المنصة'),
        'admin_email' => env('SEED_ADMIN_EMAIL', 'admin@example.com'),
        'admin_password' => env('SEED_ADMIN_PASSWORD'),
        'demo_password' => env('SEED_DEMO_PASSWORD'),
    ],

    /*
    | Brute-force protection for login/register (attempts per minute).
    */
    'auth_throttle' => [
        'per_email_ip' => (int) env('AUTH_THROTTLE_PER_MINUTE', 5),
        'per_ip' => (int) env('AUTH_THROTTLE_IP_PER_MINUTE', 20),
    ],

    'pagination' => [
        'default' => 15,
        'max' => 100,
    ],
];
