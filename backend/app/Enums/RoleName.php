<?php

namespace App\Enums;

enum RoleName: string
{
    case Admin = 'admin';
    case Instructor = 'instructor';
    case Student = 'student';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'مدير',
            self::Instructor => 'مدرّب',
            self::Student => 'طالب',
        };
    }
}
