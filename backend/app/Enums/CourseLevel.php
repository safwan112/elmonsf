<?php

namespace App\Enums;

enum CourseLevel: string
{
    case Beginner = 'beginner';
    case Intermediate = 'intermediate';
    case Advanced = 'advanced';
    case AllLevels = 'all_levels';

    public function label(): string
    {
        return match ($this) {
            self::Beginner => 'مبتدئ',
            self::Intermediate => 'متوسط',
            self::Advanced => 'متقدم',
            self::AllLevels => 'جميع المستويات',
        };
    }
}
