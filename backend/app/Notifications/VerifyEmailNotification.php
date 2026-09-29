<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

class VerifyEmailNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public const EXPIRES_MINUTES = 60;

    public function __construct()
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

    public function toMail(User $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('تأكيد بريدك الإلكتروني')
            ->greeting('مرحباً '.$notifiable->name)
            ->line('شكراً لتسجيلك. اضغط على الزر أدناه لتأكيد بريدك الإلكتروني وتفعيل جميع مزايا حسابك.')
            ->action('تأكيد البريد الإلكتروني', self::urlFor($notifiable))
            ->line('ينتهي هذا الرابط خلال '.self::EXPIRES_MINUTES.' دقيقة.')
            ->line('إذا لم تنشئ حساباً لدينا فتجاهل هذه الرسالة.');
    }

    /**
     * SPA link carrying a relative signed API URL's parameters. The SPA posts
     * them back to the API, which validates the signature.
     */
    public static function urlFor(User $user): string
    {
        $signed = URL::temporarySignedRoute(
            'api.v1.auth.verification.verify',
            now()->addMinutes(self::EXPIRES_MINUTES),
            ['id' => $user->getKey(), 'hash' => sha1($user->getEmailForVerification())],
            absolute: false,
        );

        parse_str((string) parse_url($signed, PHP_URL_QUERY), $query);

        return config('platform.frontend_url').'/verify-email?'.http_build_query([
            'id' => $user->getKey(),
            'hash' => sha1($user->getEmailForVerification()),
            'expires' => $query['expires'] ?? '',
            'signature' => $query['signature'] ?? '',
        ]);
    }
}
