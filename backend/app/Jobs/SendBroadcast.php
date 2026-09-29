<?php

namespace App\Jobs;

use App\Models\Broadcast;
use App\Notifications\BroadcastNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Throwable;

/**
 * Fans a broadcast out to its audience in chunks, so large audiences never
 * load at once. Runs on the queue; each recipient's notification is itself
 * queued (mail) or written in bulk (database).
 */
class SendBroadcast implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 900;

    public function __construct(public readonly Broadcast $broadcast) {}

    public function handle(): void
    {
        $broadcast = $this->broadcast->fresh();
        if (! $broadcast || $broadcast->status === 'sent') {
            return;
        }

        $broadcast->forceFill(['status' => 'sending'])->save();
        $count = 0;

        $broadcast->recipients()->select(['users.id', 'users.name', 'users.email', 'users.locale', 'users.marketing_emails'])
            ->orderBy('users.id')
            ->chunkById(500, function ($users) use ($broadcast, &$count) {
                Notification::send($users, new BroadcastNotification($broadcast));
                $count += $users->count();
            }, 'users.id', 'id');

        $broadcast->forceFill(['status' => 'sent', 'recipients_count' => $count, 'sent_at' => now()])->save();
    }

    public function failed(Throwable $e): void
    {
        Log::error('broadcast.failed', ['broadcast' => $this->broadcast->id, 'error' => $e->getMessage()]);
        $this->broadcast->forceFill(['status' => 'failed'])->save();
    }
}
