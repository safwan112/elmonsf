<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Course;
use App\Models\Instructor;
use App\Models\Page;
use App\Models\Post;
use App\Models\Product;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * XML sitemap of public SPA URLs. The SPA host proxies /sitemap.xml here.
 */
class SitemapController extends Controller
{
    public const CACHE_KEY = 'sitemap.xml';

    /** CMS pages that the SPA serves at the site root. */
    public const TOP_LEVEL_PAGES = ['about', 'terms', 'privacy', 'refund-policy'];

    public function __invoke(): Response
    {
        $xml = Cache::remember(self::CACHE_KEY, now()->addHour(), fn () => $this->build());

        return response($xml, 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }

    private function build(): string
    {
        $base = config('platform.frontend_url');
        $urls = [];
        $add = function (string $path, ?Carbon $modified = null, string $priority = '0.5') use (&$urls, $base) {
            $urls[] = [
                'loc' => $base.implode('/', array_map('rawurlencode', explode('/', $path))),
                'lastmod' => $modified?->toAtomString(),
                'priority' => $priority,
            ];
        };

        foreach (['/' => '1.0', '/courses' => '0.9', '/products' => '0.8', '/categories' => '0.7', '/instructors' => '0.6', '/blog' => '0.7', '/faq' => '0.5', '/contact' => '0.4'] as $path => $priority) {
            $add($path, null, $priority);
        }

        Category::query()->active()->get(['slug', 'updated_at'])
            ->each(fn ($c) => $add('/categories/'.$c->slug, $c->updated_at, '0.6'));
        Course::query()->published()->get(['slug', 'updated_at'])
            ->each(fn ($c) => $add('/courses/'.$c->slug, $c->updated_at, '0.9'));
        Product::query()->published()->get(['slug', 'updated_at'])
            ->each(fn ($p) => $add('/products/'.$p->slug, $p->updated_at, '0.7'));
        Instructor::query()->active()->get(['slug', 'updated_at'])
            ->each(fn ($i) => $add('/instructors/'.$i->slug, $i->updated_at, '0.5'));
        Post::query()->published()->get(['slug', 'updated_at'])
            ->each(fn ($p) => $add('/blog/'.$p->slug, $p->updated_at, '0.6'));
        // Well-known pages have short SPA routes; others live under /pages/.
        Page::query()->published()->get(['slug', 'updated_at'])
            ->each(fn ($p) => $add(
                in_array($p->slug, self::TOP_LEVEL_PAGES, true) ? '/'.$p->slug : '/pages/'.$p->slug,
                $p->updated_at,
                '0.3',
            ));

        $out = '<?xml version="1.0" encoding="UTF-8"?>'."\n".'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";
        foreach ($urls as $u) {
            $out .= '  <url><loc>'.htmlspecialchars($u['loc'], ENT_XML1).'</loc>'
                .($u['lastmod'] ? '<lastmod>'.$u['lastmod'].'</lastmod>' : '')
                .'<priority>'.$u['priority'].'</priority></url>'."\n";
        }

        return $out.'</urlset>'."\n";
    }
}
