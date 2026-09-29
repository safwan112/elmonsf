<?php

namespace App\Http\Controllers\Api\V1\Content;

use App\Http\Controllers\Controller;
use App\Models\NewsletterSubscriber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class NewsletterController extends Controller
{
    /**
     * Idempotent; the same answer whether or not the address was known.
     */
    public function subscribe(Request $request): JsonResponse
    {
        $email = Str::lower(trim((string) $request->input('email')));
        $request->merge(['email' => $email])->validate(['email' => ['required', 'string', 'email', 'max:255']]);

        $subscriber = NewsletterSubscriber::query()->firstOrNew(['email' => $email]);
        if (! $subscriber->exists) {
            $subscriber->token = Str::random(48);
            $subscriber->ip_address = $request->ip();
        }
        if (! $subscriber->exists || $subscriber->unsubscribed_at !== null) {
            $subscriber->subscribed_at = now();
            $subscriber->unsubscribed_at = null;
        }
        $subscriber->save();

        return response()->json(['message' => __('api.newsletter_subscribed')]);
    }

    public function unsubscribe(Request $request): JsonResponse
    {
        $token = (string) $request->validate(['token' => ['required', 'string', 'size:48']])['token'];

        NewsletterSubscriber::query()
            ->where('token', $token)
            ->whereNull('unsubscribed_at')
            ->update(['unsubscribed_at' => now()]);

        return response()->json(['message' => __('api.newsletter_unsubscribed')]);
    }
}
