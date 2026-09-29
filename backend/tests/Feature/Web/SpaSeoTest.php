<?php

use App\Models\Course;
use App\Models\CoursePlan;
use App\Models\Post;

beforeEach(function () {
    $this->index = tempnam(sys_get_temp_dir(), 'spa').'.html';
    file_put_contents($this->index, <<<'HTML'
<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <title>ذروة — افتراضي</title>
    <meta name="description" content="وصف افتراضي" />
    <meta property="og:title" content="افتراضي" />
    <meta property="og:image" content="/og-default.svg" />
    <script>
      ;(function () { document.documentElement.dataset.x = '1' })()
    </script>
  </head>
  <body><div id="root"></div><script type="module" src="/assets/index.js"></script></body>
</html>
HTML);
    config(['platform.spa.index' => $this->index, 'platform.frontend_url' => 'https://example.sa']);
});

afterEach(fn () => @unlink($this->index));

it('serves the SPA shell with course metadata for crawlers', function () {
    $course = Course::factory()->create([
        'title' => 'تأسيس الكمي', 'slug' => 'تأسيس-الكمي', 'subtitle' => 'من الصفر حتى الاحتراف', 'rating_avg' => 4.8, 'rating_count' => 10,
    ]);
    CoursePlan::factory()->for($course)->create(['name' => '3 أشهر', 'price_amount' => 19900]);

    $response = $this->get('/courses/'.rawurlencode('تأسيس-الكمي'))->assertOk();
    $html = $response->getContent();

    expect($html)
        ->toContain('<title>تأسيس الكمي | ')
        ->toContain('<meta name="description" content="من الصفر حتى الاحتراف" />')
        ->toContain('<meta property="og:title" content="تأسيس الكمي | ')
        ->toContain('<link rel="canonical" href="https://example.sa/courses/'.rawurlencode('تأسيس-الكمي').'" />')
        ->toContain('<meta property="og:image" content="https://example.sa/og-default.svg" />')
        ->toContain('"@type":"Course"')
        ->toContain('"price":199')
        ->toContain('<div id="root"></div>')
        ->not->toContain('وصف افتراضي');
    expect(substr_count($html, 'name="description"'))->toBe(1);

    // Strict CSP: our scripts plus the hash of the inline theme script.
    $csp = $response->headers->get('Content-Security-Policy');
    expect($csp)->toContain("script-src 'self' 'sha256-")->not->toContain('unsafe-inline\' https://fonts.googleapis.com; script')
        ->and($response->headers->get('Cache-Control'))->toContain('no-cache');
});

it('escapes content and neutralises script injection in metadata', function () {
    Post::factory()->create([
        'title' => '"><script>alert(1)</script>',
        'slug' => 'xss',
        'excerpt' => '</script><script>alert(2)</script>',
        'status' => 'published',
        'published_at' => now()->subDay(),
    ]);

    $html = $this->get('/blog/xss')->assertOk()->getContent();

    expect($html)->not->toContain('<script>alert')
        ->toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
        ->toContain('</script>');
});

it('answers 404 with noindex for unknown or unpublished pages', function () {
    Course::factory()->draft()->create(['slug' => 'draft-course']);

    foreach (['/courses/missing', '/courses/draft-course', '/blog/nope', '/nonsense/page/deep'] as $path) {
        $response = $this->get($path)->assertNotFound();
        expect($response->getContent())->toContain('noindex')->toContain('<div id="root"></div>');
    }
});

it('marks private areas noindex and keeps listings indexable', function () {
    $this->get('/dashboard/courses')->assertOk()->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    $this->get('/admin')->assertOk()->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    $this->get('/courses')->assertOk()->assertHeader('X-Robots-Tag', 'index, follow');
    expect($this->get('/courses')->getContent())->toContain('<title>الدورات | ');
});

it('leaves API, sanctum and sitemap routes alone', function () {
    $this->getJson('/api/v1/health')->assertOk()->assertJsonMissingPath('html');
    $this->getJson('/api/v1/does-not-exist')->assertNotFound()->assertJsonPath('code', 'not_found');
    $this->get('/sitemap.xml')->assertOk()->assertHeader('Content-Type', 'application/xml; charset=UTF-8');
});

it('falls back to the API descriptor when no SPA build exists', function () {
    config(['platform.spa.index' => '/nonexistent/index.html']);

    $this->get('/')->assertOk()->assertJsonStructure(['name', 'api']);
    $this->get('/courses')->assertNotFound();
});
