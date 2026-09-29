<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Support\SpaMeta;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Serves the built React SPA (index.html) for site routes in production,
 * with per-page <title>, description, canonical, Open Graph, robots and
 * JSON-LD injected so crawlers and link previews see real content.
 * Unknown detail pages answer 404 (the SPA still renders its own 404).
 */
class SpaController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $index = (string) config('platform.spa.index');
        abort_unless(is_file($index), 404);

        $meta = SpaMeta::for('/'.$request->decodedPath());
        $html = self::inject((string) file_get_contents($index), $meta);

        return response($html, $meta['status'])
            ->header('Content-Type', 'text/html; charset=UTF-8')
            // Hashed assets are cached forever; the HTML always revalidates.
            ->header('Cache-Control', 'no-cache')
            ->header('Content-Security-Policy', self::csp($html))
            ->header('X-Robots-Tag', $meta['robots']);
    }

    /**
     * @param  array{title: string, description: string, image: ?string, type: string, robots: string, canonical: string, jsonld: ?array<string, mixed>}  $meta
     */
    public static function inject(string $html, array $meta): string
    {
        $image = $meta['image'] ?? '/og-default.svg';
        if (str_starts_with($image, '/')) {
            $image = config('platform.frontend_url').$image;
        }

        $html = (string) preg_replace('#<title>.*?</title>#s', '<title>'.e($meta['title']).'</title>', $html, 1);

        $tags = [
            ['name', 'description', $meta['description']],
            ['name', 'robots', $meta['robots']],
            ['property', 'og:title', $meta['title']],
            ['property', 'og:description', $meta['description']],
            ['property', 'og:type', $meta['type']],
            ['property', 'og:url', $meta['canonical']],
            ['property', 'og:image', $image],
            ['name', 'twitter:title', $meta['title']],
            ['name', 'twitter:description', $meta['description']],
            ['name', 'twitter:image', $image],
        ];
        foreach ($tags as [$attr, $key, $content]) {
            $html = self::meta($html, $attr, $key, $content);
        }

        $head = '<link rel="canonical" href="'.e($meta['canonical']).'" />';
        if ($meta['jsonld']) {
            // JSON_HEX_TAG keeps "</script>" in content from closing the tag.
            $json = json_encode($meta['jsonld'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP);
            $head .= "\n    <script id=\"seo-jsonld\" type=\"application/ld+json\">{$json}</script>";
        }

        return (string) preg_replace('#</head>#', "    {$head}\n  </head>", $html, 1);
    }

    private static function meta(string $html, string $attr, string $key, string $content): string
    {
        $tag = '<meta '.$attr.'="'.$key.'" content="'.e($content).'" />';
        $pattern = '#<meta\s+'.$attr.'="'.preg_quote($key, '#').'"\s+content="[^"]*"\s*/?>#';

        return preg_match($pattern, $html)
            ? (string) preg_replace($pattern, $tag, $html, 1)
            : (string) preg_replace('#</head>#', "    {$tag}\n  </head>", $html, 1);
    }

    /** CSP for the HTML shell: only our own scripts plus hashes of inline ones. */
    private static function csp(string $html): string
    {
        preg_match_all('#<script(?![^>]*\bsrc=)(?![^>]*application/ld\+json)[^>]*>(.*?)</script>#s', $html, $m);
        $hashes = array_map(fn ($code) => "'sha256-".base64_encode(hash('sha256', $code, true))."'", $m[1]);
        $frames = 'https://www.youtube-nocookie.com https://player.vimeo.com https://iframe.mediadelivery.net';

        return implode('; ', [
            "default-src 'self'",
            "script-src 'self' ".implode(' ', $hashes),
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            "img-src 'self' data: blob: https:",
            "connect-src 'self'",
            "frame-src {$frames}",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
        ]);
    }
}
