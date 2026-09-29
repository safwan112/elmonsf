<?php

namespace App\Enums;

enum LessonType: string
{
    case Video = 'video';
    case Text = 'text';
    case File = 'file';
    case Quiz = 'quiz';

    public function label(): string
    {
        return match ($this) {
            self::Video => 'فيديو',
            self::Text => 'درس مقروء',
            self::File => 'ملف',
            self::Quiz => 'اختبار قصير',
        };
    }
}
