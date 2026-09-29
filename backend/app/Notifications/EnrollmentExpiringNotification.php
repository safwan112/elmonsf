<?php

namespace App\Notifications;

use App\Models\Enrollment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EnrollmentExpiringNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly Enrollment $enrollment, public readonly int $days) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $course = $this->enrollment->course;

        return (new MailMessage)
            ->subject($this->title())
            ->greeting('مرحباً '.$notifiable->name)
            ->line($this->body())
            ->action('جدّد اشتراكك', config('platform.frontend_url').'/courses/'.rawurlencode((string) $course?->slug))
            ->line('إن كنت قد جدّدت بالفعل فتجاهل هذه الرسالة.');
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'enrollment_expiring',
            'title' => $this->title(),
            'body' => $this->body(),
            'url' => '/courses/'.rawurlencode((string) $this->enrollment->course?->slug),
            'course_id' => $this->enrollment->course_id,
        ];
    }

    private function title(): string
    {
        return $this->days <= 1 ? 'ينتهي اشتراكك غداً' : "ينتهي اشتراكك خلال {$this->days} أيام";
    }

    private function body(): string
    {
        return 'اقترب انتهاء وصولك إلى دورة «'.$this->enrollment->course?->title.'» بتاريخ '
            .$this->enrollment->expires_at?->timezone('Asia/Riyadh')->format('Y/m/d').'. جدّد اشتراكك لتحتفظ بتقدّمك.';
    }
}
