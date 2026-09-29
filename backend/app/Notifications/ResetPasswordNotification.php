<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly string $token)
    {
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
        $minutes = (int) config('auth.passwords.users.expire', 60);

        return (new MailMessage)
            ->subject('إعادة تعيين كلمة المرور')
            ->greeting('مرحباً '.$notifiable->name)
            ->line('وصلنا طلب لإعادة تعيين كلمة المرور لحسابك.')
            ->action('إعادة تعيين كلمة المرور', $this->resetUrl($notifiable))
            ->line("ينتهي هذا الرابط خلال {$minutes} دقيقة.")
            ->line('إذا لم تطلب ذلك فلا حاجة لأي إجراء، وستبقى كلمة مرورك الحالية كما هي.');
    }

    public function resetUrl(object $notifiable): string
    {
        return config('platform.frontend_url').'/reset-password?'.http_build_query([
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ]);
    }
}
