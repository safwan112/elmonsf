<?php

namespace App\Enums;

enum EnrollmentStatus: string
{
    case Active = 'active';
    case Expired = 'expired';
    case Revoked = 'revoked';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'فعّال',
            self::Expired => 'منتهي',
            self::Revoked => 'ملغى',
        };
    }
}
