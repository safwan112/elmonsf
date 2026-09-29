<?php

namespace App\Enums;

enum QuestionDifficulty: string
{
    case Easy = 'easy';
    case Medium = 'medium';
    case Hard = 'hard';

    public function label(): string
    {
        return match ($this) {
            self::Easy => 'سهل',
            self::Medium => 'متوسط',
            self::Hard => 'صعب',
        };
    }
}
