<?php

namespace App\Enums;

enum OrderStatus: string
{
    case Pending = 'pending';
    case Paid = 'paid';
    case Failed = 'failed';
    case Cancelled = 'cancelled';
    case Refunded = 'refunded';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'بانتظار الدفع',
            self::Paid => 'مدفوع',
            self::Failed => 'فشل الدفع',
            self::Cancelled => 'ملغي',
            self::Refunded => 'مسترجع',
        };
    }

    /** Orders that can still be paid (a new payment attempt may be started). */
    public function isPayable(): bool
    {
        return in_array($this, [self::Pending, self::Failed], true);
    }
}
