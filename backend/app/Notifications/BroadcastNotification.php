<?php

namespace App\Notifications;

use App\Models\Broadcast;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** An admin announcement: in-app always, email when requested and allowed. */
class BroadcastNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly Broadcast $broadcast) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return $this->broadcast->send_email && ($notifiable->marketing_emails ?? false)
            ? ['database', 'mail']
            : ['database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject($this->broadcast->title)
            ->greeting('مرحباً '.$notifiable->name)
            ->line($this->broadcast->body);

        if ($this->broadcast->url) {
            $mail->action('التفاصيل', self::absolute($this->broadcast->url));
        }

        return $mail->line('يمكنك إيقاف رسائل الإعلانات من صفحة ملفك الشخصي.');
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'announcement',
            'title' => $this->broadcast->title,
            'body' => $this->broadcast->body,
            'url' => $this->broadcast->url,
            'broadcast_id' => $this->broadcast->id,
        ];
    }

    public static function absolute(string $url): string
    {
        return str_starts_with($url, '/') ? config('platform.frontend_url').$url : $url;
    }
}
