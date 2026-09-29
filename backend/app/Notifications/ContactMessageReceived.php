<?php

namespace App\Notifications;

use App\Models\ContactMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ContactMessageReceived extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly ContactMessage $contact)
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
        return (new MailMessage)
            ->subject('رسالة تواصل جديدة: '.$this->contact->subject)
            ->replyTo($this->contact->email, $this->contact->name)
            ->line('وصلت رسالة جديدة عبر نموذج التواصل.')
            ->line('**الاسم:** '.$this->contact->name)
            ->line('**البريد:** '.$this->contact->email)
            ->line('**الجوال:** '.($this->contact->phone ?? '—'))
            ->line('**الموضوع:** '.$this->contact->subject)
            ->line($this->contact->message);
    }
}
