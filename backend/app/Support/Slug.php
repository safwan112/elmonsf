<?php

namespace App\Support;

/**
 * URL slugs that keep Arabic letters (better for Arabic SEO than
 * transliteration), e.g. "دورة القدرات 2026" → "دورة-القدرات-2026".
 */
final class Slug
{
    public static function make(string $text, int $maxLength = 120): string
    {
        $text = mb_strtolower(trim($text));
        $text = (string) preg_replace('/[\x{064B}-\x{065F}\x{0670}\x{0640}]/u', '', $text);
        $text = (string) preg_replace('/[^\p{L}\p{N}]+/u', '-', $text);
        $text = trim($text, '-');

        return rtrim(mb_substr($text, 0, $maxLength), '-');
    }
}
