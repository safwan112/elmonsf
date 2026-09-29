<?php

namespace App\Support;

/**
 * Turns a stored (provider, reference) pair into an embeddable URL.
 */
final class VideoEmbed
{
    public static function url(?string $provider, ?string $ref): ?string
    {
        if (! $provider || ! $ref) {
            return null;
        }

        $ref = rawurlencode($ref);

        return match ($provider) {
            'youtube' => "https://www.youtube-nocookie.com/embed/{$ref}?rel=0",
            'vimeo' => "https://player.vimeo.com/video/{$ref}",
            'bunny' => config('services.bunny.library_id')
                ? 'https://iframe.mediadelivery.net/embed/'.rawurlencode((string) config('services.bunny.library_id'))."/{$ref}"
                : null,
            default => null,
        };
    }
}
