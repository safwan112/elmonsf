<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case Pending = 'pending';
    case Paid = 'paid';
    case Failed = 'failed';
    case Cancelled = 'cancelled';
    case Refunded = 'refunded';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'قيد المعالجة',
            self::Paid => 'مدفوع',
            self::Failed => 'فشل',
            self::Cancelled => 'ملغي',
            self::Refunded => 'مسترجع',
        };
    }

    public function isFinal(): bool
    {
        return $this !== self::Pending;
    }
}
