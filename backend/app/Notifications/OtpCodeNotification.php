<?php

namespace App\Notifications;

use App\Enums\OtpPurpose;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OtpCodeNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly string $code,
        public readonly OtpPurpose $purpose,
        public readonly int $ttlMinutes,
    ) {
        $this->afterCommit();
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("رمز التحقق: {$this->code}")
            ->greeting('مرحباً '.$notifiable->name)
            ->line("رمز التحقق الخاص بـ{$this->purpose->label()} هو:")
            ->line("**{$this->code}**")
            ->line("ينتهي هذا الرمز خلال {$this->ttlMinutes} دقائق، ويمكن استخدامه مرة واحدة فقط.")
            ->line('إذا لم تطلب هذا الرمز فتجاهل الرسالة، ولا تشاركه مع أي شخص.');
    }
}
