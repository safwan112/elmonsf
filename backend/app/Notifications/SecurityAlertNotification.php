<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells the account owner that a sensitive change happened, so an attacker
 * cannot silently take over an account.
 */
class SecurityAlertNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly string $subject,
        public readonly string $body,
    ) {
        $this->afterCommit();
    }

    public static function passwordChanged(): self
    {
        return new self(
            'تم تغيير كلمة المرور',
            'تم تغيير كلمة مرور حسابك للتو، وسُجّل خروجك من الأجهزة الأخرى.',
        );
    }

    public static function passwordReset(): self
    {
        return new self(
            'تمت إعادة تعيين كلمة المرور',
            'تمت إعادة تعيين كلمة مرور حسابك للتو، وسُجّل خروجك من جميع الأجهزة.',
        );
    }

    public static function emailChanged(string $newEmail): self
    {
        return new self(
            'تم تغيير البريد الإلكتروني لحسابك',
            'تم تغيير البريد الإلكتروني المرتبط بحسابك إلى: '.self::mask($newEmail),
        );
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
            ->subject($this->subject)
            ->line($this->body)
            ->line('إذا لم تقم بهذا الإجراء فأعد تعيين كلمة المرور فوراً وتواصل مع الدعم.')
            ->action('الدخول إلى حسابي', config('platform.frontend_url').'/login');
    }

    private static function mask(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');
        $visible = mb_substr($local, 0, 2);

        return $visible.str_repeat('•', max(1, mb_strlen($local) - 2)).'@'.$domain;
    }
}
