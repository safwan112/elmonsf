<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class PaymentFailedNotification extends Notification implements ShouldQueue
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
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'payment_failed',
            'title' => 'لم تكتمل عملية الدفع',
            'body' => 'لم تنجح عملية الدفع للطلب '.$this->order->number.'. يمكنك إعادة المحاولة من صفحة الطلب.',
            'order_number' => $this->order->number,
            'url' => '/dashboard/orders/'.$this->order->number,
        ];
    }
}
