<?php

namespace App\Http\Controllers\Api\V1\Content;

use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\ContactRequest;
use App\Models\ContactMessage;
use App\Models\User;
use App\Notifications\ContactMessageReceived;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class ContactController extends Controller
{
    public function store(ContactRequest $request): JsonResponse
    {
        $response = response()->json(['message' => __('api.contact_received')], 201);

        // Bots that fill the hidden field get the same answer, but nothing is stored.
        if (filled($request->validated('website'))) {
            Log::notice('contact.honeypot_triggered', ['ip' => $request->ip()]);

            return $response;
        }

        $message = ContactMessage::query()->create([
            ...$request->safe()->only(['name', 'email', 'phone', 'subject', 'message']),
            'user_id' => $request->user()?->id,
            'status' => 'new',
            'ip_address' => $request->ip(),
        ]);

        $admins = User::query()->withRole(RoleName::Admin)->where('status', 'active')->get();
        Notification::send($admins, new ContactMessageReceived($message));

        return $response;
    }
}
