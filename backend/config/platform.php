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
        // Max auth emails (reset links, codes, verification) per address per hour.
        'emails_per_hour' => (int) env('AUTH_EMAILS_PER_HOUR', 6),
    ],

    // Public form submissions (contact, newsletter) per IP per hour.
    'contact_per_hour' => (int) env('CONTACT_PER_HOUR', 10),

    'pagination' => [
        'default' => 15,
        'max' => 100,
    ],
];
