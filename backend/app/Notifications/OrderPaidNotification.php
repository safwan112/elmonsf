<?php

namespace App\Notifications;

use App\Models\Order;
use App\Support\Money;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderPaidNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly Order $order)
    {
        $this->afterCommit();
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $order = $this->order->loadMissing(['items', 'invoice']);
        $mail = (new MailMessage)
            ->subject('تم تأكيد طلبك '.$order->number)
            ->greeting('مرحباً '.$notifiable->name)
            ->line('شكراً لك! تم استلام دفعتك بنجاح، وأصبح المحتوى متاحاً في لوحتك.');

        foreach ($order->items as $item) {
            $mail->line('• '.$item->title.($item->plan_name ? ' — '.$item->plan_name : ''));
        }

        return $mail
            ->line('الإجمالي: '.number_format(Money::toMajor($order->total_amount), 2).' '.$order->currency.' (شامل ضريبة القيمة المضافة)')
            ->line('رقم الفاتورة: '.($order->invoice?->number ?? '—'))
            ->action('ابدأ التعلّم', config('platform.frontend_url').'/dashboard/courses');
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'order_paid',
            'title' => 'تم تأكيد طلبك',
            'body' => 'تم استلام دفعتك للطلب '.$this->order->number.' وأصبح المحتوى متاحاً.',
            'order_number' => $this->order->number,
            'url' => '/dashboard/orders/'.$this->order->number,
        ];
    }
}
