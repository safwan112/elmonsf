<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/** First in-app notification: where to start. */
class WelcomeNotification extends Notification
{
    use Queueable;

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'welcome',
            'title' => 'أهلاً بك في '.config('app.name'),
            'body' => 'ابدأ باختبار تحديد المستوى المجاني لتعرف نقاط قوتك، ثم اختر الدورة المناسبة لك.',
            'url' => '/dashboard/exams',
        ];
    }
}
