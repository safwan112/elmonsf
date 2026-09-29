<?php

namespace App\Enums;

enum AttemptStatus: string
{
    case InProgress = 'in_progress';
    case Submitted = 'submitted';
    // Time ran out; graded automatically with the answers saved so far.
    case Expired = 'expired';

    public function label(): string
    {
        return match ($this) {
            self::InProgress => 'قيد الحل',
            self::Submitted => 'مُسلَّم',
            self::Expired => 'انتهى الوقت',
        };
    }

    public function isFinished(): bool
    {
        return $this !== self::InProgress;
    }
}
