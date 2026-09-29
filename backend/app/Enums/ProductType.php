<?php

namespace App\Enums;

enum ProductType: string
{
    case Ebook = 'ebook';
    case QuestionBank = 'question_bank';
    case Bundle = 'bundle';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Ebook => 'كتاب إلكتروني',
            self::QuestionBank => 'بنك أسئلة',
            self::Bundle => 'حزمة',
            self::Other => 'منتج رقمي',
        };
    }
}
