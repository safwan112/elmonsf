<?php

namespace App\Enums;

enum OtpPurpose: string
{
    case Login = 'login';

    public function label(): string
    {
        return match ($this) {
            self::Login => 'تسجيل الدخول',
        };
    }
}
