<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    // Primary payment gateway (API v3). Server-side only.
    'myfatoorah' => [
        'api_key' => env('MYFATOORAH_API_KEY'),
        'base_url' => rtrim((string) env('MYFATOORAH_BASE_URL', 'https://apitest.myfatoorah.com'), '/'),
        'webhook_secret' => env('MYFATOORAH_WEBHOOK_SECRET'),
        'currency' => env('MYFATOORAH_CURRENCY', 'SAR'),
        'timeout' => (int) env('MYFATOORAH_TIMEOUT', 20),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
