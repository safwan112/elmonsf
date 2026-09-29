<?php

namespace App\Notifications;

use App\Enums\ReviewStatus;
use App\Models\Review;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ReviewModeratedNotification extends Notification
{
    use Queueable;

    public function __construct(public readonly Review $review) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        $approved = $this->review->status === ReviewStatus::Approved;
        $course = $this->review->course;

        return [
            'type' => 'review_moderated',
            'title' => $approved ? 'تم نشر تقييمك' : 'لم يُنشر تقييمك',
            'body' => $approved
                ? 'شكراً لك! أصبح تقييمك لدورة «'.$course?->title.'» ظاهراً للطلاب.'
                : 'لم نتمكن من نشر تقييمك لدورة «'.$course?->title.'» لمخالفته إرشادات المراجعات. يمكنك تعديله وإرساله من جديد.',
            'url' => '/courses/'.rawurlencode((string) $course?->slug),
        ];
    }
}
