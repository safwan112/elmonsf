<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Markdown → safe HTML for content fields. Raw HTML in the source is
 * stripped and unsafe links (javascript:, data:) are dropped, so the SPA can
 * render the output directly.
 */
final class RichText
{
    public static function toHtml(?string $markdown): ?string
    {
        if ($markdown === null || trim($markdown) === '') {
            return null;
        }

        return Str::markdown($markdown, [
            'html_input' => 'strip',
            'allow_unsafe_links' => false,
            'max_nesting_level' => 20,
        ]);
    }

    public static function excerpt(?string $markdown, int $limit = 180): ?string
    {
        if ($markdown === null) {
            return null;
        }

        $plain = trim((string) preg_replace('/\s+/u', ' ', strip_tags((string) self::toHtml($markdown))));

        return Str::limit($plain, $limit);
    }
}
