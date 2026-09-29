<?php

namespace App\Http\Controllers\Api\V1\User;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Notifications\DatabaseNotification;

/**
 * The signed-in user's in-app notifications. Only the user's own rows are
 * ever reachable (queries go through the notifiable relation).
 */
class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['filter' => ['nullable', 'in:all,unread']]);

        $page = $request->user()->notifications()
            ->when($request->query('filter') === 'unread', fn ($q) => $q->whereNull('read_at'))
            ->paginate(min(50, max(1, $request->integer('per_page', 20))))
            ->withQueryString();

        return JsonResource::collection($page->through(fn (DatabaseNotification $n) => self::present($n)))
            ->additional(['unread_count' => $request->user()->unreadNotifications()->count()])
            ->response();
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json(['data' => ['unread_count' => $request->user()->unreadNotifications()->count()]]);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()->notifications()->whereKey($id)->firstOrFail();
        $notification->markAsRead();

        return response()->json(['data' => self::present($notification)]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['data' => ['unread_count' => 0]]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $request->user()->notifications()->whereKey($id)->firstOrFail()->delete();

        return response()->json(['message' => __('admin.deleted')]);
    }

    /** @return array<string, mixed> */
    public static function present(DatabaseNotification $n): array
    {
        $data = $n->data;
        $url = $data['url'] ?? null;

        return [
            'id' => $n->id,
            'type' => $data['type'] ?? 'general',
            'title' => (string) ($data['title'] ?? ''),
            'body' => (string) ($data['body'] ?? ''),
            // Only in-app paths are followed by the SPA.
            'url' => is_string($url) && str_starts_with($url, '/') && ! str_starts_with($url, '//') ? $url : null,
            'read_at' => $n->read_at?->toIso8601String(),
            'created_at' => $n->created_at?->toIso8601String(),
        ];
    }
}
