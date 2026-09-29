<?php

namespace App\Support;

/**
 * Normalisation that makes Arabic search forgiving: users type with or
 * without hamza, diacritics, tatweel, or taa marbuta vs haa, and with
 * Arabic-Indic or Latin digits.
 */
final class ArabicText
{
    private const LETTER_MAP = [
        'أ' => 'ا', 'إ' => 'ا', 'آ' => 'ا', 'ٱ' => 'ا',
        'ة' => 'ه',
        'ى' => 'ي', 'ئ' => 'ي',
        'ؤ' => 'و',
        '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
        '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
        '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4',
        '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
    ];

    public static function normalize(?string $text): string
    {
        if ($text === null || $text === '') {
            return '';
        }

        $text = mb_strtolower(strip_tags($text));
        // Harakat, Quranic marks, superscript alef, tatweel.
        $text = (string) preg_replace('/[\x{0610}-\x{061A}\x{064B}-\x{065F}\x{0670}\x{06D6}-\x{06ED}\x{0640}]/u', '', $text);
        $text = strtr($text, self::LETTER_MAP);
        // Everything that is not a letter or digit becomes a space.
        $text = (string) preg_replace('/[^\p{L}\p{N}]+/u', ' ', $text);

        return trim((string) preg_replace('/\s+/u', ' ', $text));
    }

    /**
     * Normalised search terms (max 8, each at least 2 characters).
     *
     * @return list<string>
     */
    public static function terms(?string $query): array
    {
        $terms = array_filter(
            explode(' ', self::normalize($query)),
            fn (string $t) => mb_strlen($t) >= 2,
        );

        return array_slice(array_values(array_unique($terms)), 0, 8);
    }
}
