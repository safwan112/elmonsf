<?php

namespace App\Notifications;

use App\Models\Order;
use App\Models\Payment;
use App\Support\Money;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Admin alert: a payment needs a human (amount mismatch or a duplicate
 * payment that should be refunded).
 */
class PaymentNeedsReviewNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Order $order,
        public readonly Payment $payment,
        public readonly string $reason,
    ) {
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
        $label = $this->reason === 'duplicate_payment' ? 'دفعة مكررة تحتاج إلى استرجاع' : 'مبلغ الدفع لا يطابق الطلب';

        return (new MailMessage)
            ->subject('تنبيه دفع: '.$label.' — '.$this->order->number)
            ->line($label.'.')
            ->line('الطلب: '.$this->order->number)
            ->line('الدفعة: #'.$this->payment->id.' ('.$this->payment->provider.' / '.($this->payment->provider_payment_id ?? '—').')')
            ->line('المبلغ المتوقع: '.number_format(Money::toMajor($this->payment->amount), 2).' '.$this->payment->currency)
            ->action('فتح الطلب', config('platform.frontend_url').'/admin/orders/'.$this->order->number);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'payment_review',
            'title' => 'دفعة تحتاج مراجعة',
            'body' => $this->reason.' — '.$this->order->number,
            'order_number' => $this->order->number,
            'url' => '/admin/orders/'.$this->order->number,
        ];
    }
}
