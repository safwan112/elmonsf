<?php

namespace App\Support;

use App\Models\Category;
use App\Models\Course;
use App\Models\CoursePlan;
use App\Models\Instructor;
use App\Models\Page;
use App\Models\Post;
use App\Models\Product;
use App\Models\SiteSetting;

/**
 * Page metadata for a site path, for crawlers that do not run JavaScript.
 * Mirrors what the SPA's <Seo> component sets at runtime.
 *
 * @phpstan-type Meta array{status: int, title: string, description: string, image: ?string, type: string, robots: string, canonical: string, jsonld: ?array<string, mixed>}
 */
final class SpaMeta
{
    /** Areas that must never be indexed. */
    private const PRIVATE = ['dashboard', 'admin', 'cart', 'checkout', 'payment', 'login', 'register', 'forgot-password', 'reset-password', 'verify-email'];

    /** Static listing pages. */
    private const LISTINGS = [
        'courses' => ['الدورات', 'تصفّح دورات القدرات والتحصيلي: شروحات مسجلة، تدريب متدرّج، واختبارات محاكية.'],
        'products' => ['المنتجات', 'بنوك أسئلة وملخصات وحزم تدريبية لاختبارات القدرات والتحصيلي.'],
        'categories' => ['التصنيفات', 'تصفّح الدورات والمنتجات حسب الاختبار والمادة.'],
        'instructors' => ['المدرّبون', 'تعرّف على مدرّبي المنصة وخبراتهم.'],
        'blog' => ['المدونة', 'مقالات ونصائح للاستعداد لاختبارات القدرات والتحصيلي.'],
        'faq' => ['الأسئلة الشائعة', 'إجابات عن أكثر الأسئلة تكراراً حول الاشتراك والدفع والدورات.'],
        'contact' => ['تواصل معنا', 'راسل فريق الدعم وسنرد عليك في أقرب وقت.'],
        'search' => ['البحث', 'ابحث في الدورات والمنتجات والمقالات.'],
    ];

    /** CMS pages served at the site root. */
    private const ROOT_PAGES = ['about', 'terms', 'privacy', 'refund-policy'];

    /** @return Meta */
    public static function for(string $path): array
    {
        $segments = array_values(array_filter(explode('/', trim($path, '/')), fn ($s) => $s !== ''));
        $canonical = config('platform.frontend_url').'/'.implode('/', array_map('rawurlencode', $segments));
        $meta = self::defaults(rtrim($canonical, '/') ?: config('platform.frontend_url'));

        $first = $segments[0] ?? null;
        $slug = $segments[1] ?? null;

        if ($first === null) {
            return $meta;
        }
        if (in_array($first, self::PRIVATE, true)) {
            return [...$meta, 'robots' => 'noindex, nofollow'];
        }
        if (count($segments) === 1 && isset(self::LISTINGS[$first])) {
            [$title, $description] = self::LISTINGS[$first];

            return [...$meta, 'title' => self::title($title), 'description' => $description];
        }
        if (count($segments) === 1 && in_array($first, self::ROOT_PAGES, true)) {
            return self::page($meta, $first);
        }
        if (count($segments) === 2 && $slug !== null) {
            return match ($first) {
                'courses' => self::course($meta, $slug),
                'products' => self::product($meta, $slug),
                'blog' => self::post($meta, $slug),
                'categories' => self::category($meta, $slug),
                'instructors' => self::instructor($meta, $slug),
                'pages' => self::page($meta, $slug),
                default => self::notFound($meta),
            };
        }

        return self::notFound($meta);
    }

    /** @return Meta */
    private static function defaults(string $canonical): array
    {
        return [
            'status' => 200,
            'title' => self::siteName().' — منصة التدريب على اختبارات القدرات والتحصيلي',
            'description' => 'منصة تعليمية عربية للتدريب على اختبارات القدرات العامة والتحصيلي: دورات مسجلة، بنوك أسئلة متدرجة، واختبارات محاكية بتحليل فوري للأداء.',
            'image' => null,
            'type' => 'website',
            'robots' => 'index, follow',
            'canonical' => $canonical,
            'jsonld' => null,
        ];
    }

    /**
     * @param  Meta  $meta
     * @return Meta
     */
    private static function course(array $meta, string $slug): array
    {
        $course = Course::query()->published()->where('slug', $slug)->with(['activePlans', 'instructor'])->first();
        if (! $course) {
            return self::notFound($meta);
        }

        $description = $course->seo_description ?: ($course->subtitle ?: (string) RichText::excerpt($course->description));

        return [
            ...$meta,
            'title' => self::title($course->seo_title ?: $course->title),
            'description' => $description,
            'image' => $course->coverUrl(),
            'jsonld' => array_filter([
                '@context' => 'https://schema.org',
                '@type' => 'Course',
                'name' => $course->title,
                'description' => $description,
                'inLanguage' => $course->language,
                'url' => $meta['canonical'],
                'image' => $course->coverUrl(),
                'provider' => ['@type' => 'Organization', 'name' => self::siteName(), 'sameAs' => config('platform.frontend_url')],
                'offers' => $course->activePlans->map(fn (CoursePlan $p) => [
                    '@type' => 'Offer',
                    'category' => 'Paid',
                    'name' => $p->name,
                    'price' => Money::toMajor($p->price_amount),
                    'priceCurrency' => $p->currency,
                    'availability' => 'https://schema.org/InStock',
                ])->values()->all(),
                'aggregateRating' => $course->rating_count > 0
                    ? ['@type' => 'AggregateRating', 'ratingValue' => $course->rating_avg, 'ratingCount' => $course->rating_count]
                    : null,
            ], fn ($v) => $v !== null),
        ];
    }

    /**
     * @param  Meta  $meta
     * @return Meta
     */
    private static function product(array $meta, string $slug): array
    {
        $product = Product::query()->published()->where('slug', $slug)->first();
        if (! $product) {
            return self::notFound($meta);
        }

        $description = $product->seo_description ?: ($product->subtitle ?: (string) RichText::excerpt($product->description));

        return [
            ...$meta,
            'title' => self::title($product->seo_title ?: $product->title),
            'description' => $description,
            'image' => $product->coverUrl(),
            'type' => 'product',
            'jsonld' => array_filter([
                '@context' => 'https://schema.org',
                '@type' => 'Product',
                'name' => $product->title,
                'description' => $description,
                'image' => $product->coverUrl(),
                'url' => $meta['canonical'],
                'offers' => [
                    '@type' => 'Offer',
                    'price' => Money::toMajor($product->price_amount),
                    'priceCurrency' => $product->currency,
                    'availability' => 'https://schema.org/InStock',
                ],
            ], fn ($v) => $v !== null),
        ];
    }

    /**
     * @param  Meta  $meta
     * @return Meta
     */
    private static function post(array $meta, string $slug): array
    {
        $post = Post::query()->published()->where('slug', $slug)->with('author:id,name')->first();
        if (! $post) {
            return self::notFound($meta);
        }

        $description = $post->seo_description ?: ($post->excerpt ?: (string) RichText::excerpt($post->body));

        return [
            ...$meta,
            'title' => self::title($post->seo_title ?: $post->title),
            'description' => $description,
            'image' => $post->coverUrl(),
            'type' => 'article',
            'jsonld' => array_filter([
                '@context' => 'https://schema.org',
                '@type' => 'BlogPosting',
                'headline' => $post->title,
                'description' => $description,
                'image' => $post->coverUrl(),
                'datePublished' => $post->published_at?->toIso8601String(),
                'dateModified' => $post->updated_at?->toIso8601String(),
                'author' => $post->author ? ['@type' => 'Person', 'name' => $post->author->name] : null,
                'publisher' => ['@type' => 'Organization', 'name' => self::siteName()],
                'mainEntityOfPage' => $meta['canonical'],
            ], fn ($v) => $v !== null),
        ];
    }

    /**
     * @param  Meta  $meta
     * @return Meta
     */
    private static function category(array $meta, string $slug): array
    {
        $category = Category::query()->active()->where('slug', $slug)->first();

        return $category
            ? [...$meta, 'title' => self::title($category->seo_title ?: $category->name), 'description' => $category->seo_description ?: ($category->description ?: $meta['description'])]
            : self::notFound($meta);
    }

    /**
     * @param  Meta  $meta
     * @return Meta
     */
    private static function instructor(array $meta, string $slug): array
    {
        $instructor = Instructor::query()->active()->where('slug', $slug)->first();

        return $instructor
            ? [...$meta, 'title' => self::title($instructor->name), 'description' => $instructor->headline ?: (string) RichText::excerpt($instructor->bio), 'image' => $instructor->avatarUrl(), 'type' => 'profile']
            : self::notFound($meta);
    }

    /**
     * @param  Meta  $meta
     * @return Meta
     */
    private static function page(array $meta, string $slug): array
    {
        $page = Page::query()->where('slug', $slug)->where('status', 'published')->first();

        return $page
            ? [...$meta, 'title' => self::title($page->seo_title ?: $page->title), 'description' => $page->seo_description ?: (string) RichText::excerpt($page->body)]
            : self::notFound($meta);
    }

    /**
     * @param  Meta  $meta
     * @return Meta
     */
    private static function notFound(array $meta): array
    {
        return [...$meta, 'status' => 404, 'title' => self::title('الصفحة غير موجودة'), 'robots' => 'noindex, nofollow'];
    }

    private static function title(string $title): string
    {
        return $title.' | '.self::siteName();
    }

    private static function siteName(): string
    {
        $name = SiteSetting::publicValues()['site_name'] ?? null;

        return is_string($name) && $name !== '' ? $name : (string) config('app.name');
    }
}
