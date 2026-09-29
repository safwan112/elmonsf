<?php

use App\Enums\ProductType;
use App\Models\ContactMessage;
use App\Models\Course;
use App\Models\Faq;
use App\Models\Instructor;
use App\Models\NewsletterSubscriber;
use App\Models\Page;
use App\Models\Post;
use App\Models\Product;
use App\Models\SiteSetting;
use App\Models\Testimonial;
use App\Models\User;
use App\Notifications\ContactMessageReceived;
use Illuminate\Support\Facades\Notification;

it('lists and filters published products without exposing files', function () {
    Product::factory()->create(['type' => ProductType::QuestionBank, 'title' => 'بنك', 'file_path' => 'secret/file.pdf']);
    Product::factory()->create(['type' => ProductType::Ebook, 'title' => 'كتاب', 'price_amount' => 2900, 'compare_at_amount' => 5800]);
    Product::factory()->draft()->create();

    $this->getJson('/api/v1/products')->assertOk()->assertJsonCount(2, 'data');
    $this->getJson('/api/v1/products?type=ebook')
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.price.amount', 29)
        ->assertJsonPath('data.0.discount_percent', 50);

    $bank = Product::where('title', 'بنك')->first();
    $response = $this->getJson("/api/v1/products/{$bank->slug}")->assertOk()->assertJsonStructure(['data' => ['description_html', 'seo'], 'related']);
    expect($response->getContent())->not->toContain('secret/file.pdf');
});

it('lists instructors and shows an instructor with published courses', function () {
    $instructor = Instructor::factory()->create(['name' => 'أ. سارة']);
    Course::factory()->for($instructor)->create();
    Course::factory()->for($instructor)->draft()->create();

    $this->getJson('/api/v1/instructors')->assertOk()->assertJsonPath('data.0.courses_count', 1);
    $this->getJson("/api/v1/instructors/{$instructor->slug}")
        ->assertOk()
        ->assertJsonPath('data.name', 'أ. سارة')
        ->assertJsonCount(1, 'courses');
});

it('serves the blog with search and hides drafts', function () {
    Post::factory()->create(['title' => 'خطة مذاكرة القدرات']);
    Post::factory()->create(['title' => 'قلق الاختبار']);
    $draft = Post::factory()->draft()->create();

    $this->getJson('/api/v1/posts')->assertOk()->assertJsonCount(2, 'data');
    $this->getJson('/api/v1/posts?search='.urlencode('مذاكره'))->assertJsonCount(1, 'data');
    $this->getJson("/api/v1/posts/{$draft->slug}")->assertNotFound();

    $post = Post::where('title', 'قلق الاختبار')->first();
    $this->getJson("/api/v1/posts/{$post->slug}")->assertOk()->assertJsonStructure(['data' => ['body_html', 'reading_minutes'], 'more']);
});

it('serves published CMS pages, FAQs and testimonials', function () {
    Page::factory()->create(['slug' => 'about', 'title' => 'من نحن', 'body' => '## رسالتنا']);
    Faq::factory()->count(2)->create();
    Faq::factory()->create(['is_active' => false]);
    Testimonial::factory()->count(3)->create();

    $this->getJson('/api/v1/pages/about')->assertOk()->assertJsonPath('data.title', 'من نحن')
        ->assertJsonPath('data.body_html', "<h2>رسالتنا</h2>\n");
    $this->getJson('/api/v1/pages/missing')->assertNotFound();
    $this->getJson('/api/v1/faqs')->assertOk()->assertJsonCount(2, 'data');
    $this->getJson('/api/v1/testimonials')->assertOk()->assertJsonCount(3, 'data');
});

it('exposes only public settings', function () {
    SiteSetting::set('contact_email', 'hi@example.com', public: true);
    SiteSetting::set('internal_note', 'secret', public: false);

    $this->getJson('/api/v1/settings')
        ->assertOk()
        ->assertJsonPath('data.contact_email', 'hi@example.com')
        ->assertJsonMissingPath('data.internal_note');
});

it('searches across courses, products and posts', function () {
    Course::factory()->create(['title' => 'استراتيجيات الكمي']);
    Product::factory()->create(['title' => 'بنك أسئلة الكمي']);
    Post::factory()->create(['title' => 'نصائح للقسم الكمي']);
    Course::factory()->create(['title' => 'اللفظي']);

    $this->getJson('/api/v1/search?q='.urlencode('الكمي'))
        ->assertOk()
        ->assertJsonCount(1, 'data.courses')
        ->assertJsonCount(1, 'data.products')
        ->assertJsonCount(1, 'data.posts')
        ->assertJsonPath('meta.total', 3);

    $this->getJson('/api/v1/search?q=a')->assertUnprocessable();
});

it('stores contact messages and notifies admins', function () {
    Notification::fake();
    $admin = User::factory()->admin()->create();

    $this->postJson('/api/v1/contact', [
        'name' => 'سلمى',
        'email' => 'Salma@Example.com',
        'subject' => 'استفسار عن الباقات',
        'message' => 'هل يمكن ترقية الباقة لاحقاً؟',
    ])->assertCreated()->assertJsonPath('message', 'شكراً لتواصلك! استلمنا رسالتك وسنرد عليك في أقرب وقت.');

    expect(ContactMessage::sole()->email)->toBe('salma@example.com');
    Notification::assertSentTo($admin, ContactMessageReceived::class);
});

it('silently drops honeypot submissions and validates input', function () {
    Notification::fake();

    $this->postJson('/api/v1/contact', [
        'name' => 'bot', 'email' => 'bot@example.com', 'subject' => 'spam', 'message' => 'buy now buy now', 'website' => 'http://spam',
    ])->assertCreated();
    expect(ContactMessage::count())->toBe(0);

    $this->postJson('/api/v1/contact', ['name' => '', 'email' => 'bad', 'subject' => '', 'message' => 'short'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name', 'email', 'subject', 'message']);
});

it('rate limits the contact form', function () {
    config(['platform.contact_per_hour' => 2]);
    $payload = ['name' => 'سلمى', 'email' => 's@example.com', 'subject' => 'سؤال عام', 'message' => 'نص الرسالة هنا للتجربة'];

    $this->postJson('/api/v1/contact', $payload)->assertCreated();
    $this->postJson('/api/v1/contact', $payload)->assertCreated();
    $this->postJson('/api/v1/contact', $payload)->assertTooManyRequests();
});

it('subscribes to and unsubscribes from the newsletter idempotently', function () {
    $this->postJson('/api/v1/newsletter/subscribe', ['email' => 'Fan@Example.com'])->assertOk();
    $this->postJson('/api/v1/newsletter/subscribe', ['email' => 'fan@example.com'])->assertOk();

    $subscriber = NewsletterSubscriber::sole();
    expect($subscriber->email)->toBe('fan@example.com');

    $this->postJson('/api/v1/newsletter/unsubscribe', ['token' => $subscriber->token])->assertOk();
    expect($subscriber->fresh()->unsubscribed_at)->not->toBeNull();
});

it('generates a sitemap of public SPA urls', function () {
    Course::factory()->create(['slug' => 'دورة-منشورة']);
    Course::factory()->draft()->create(['slug' => 'مسودة']);
    Page::factory()->create(['slug' => 'about']);
    Page::factory()->create(['slug' => 'custom']);

    $response = $this->get('/sitemap.xml')->assertOk()->assertHeader('Content-Type', 'application/xml; charset=UTF-8');
    $xml = $response->getContent();

    expect($xml)->toContain('<loc>http://localhost:5173/courses/'.rawurlencode('دورة-منشورة').'</loc>')
        ->toContain('<loc>http://localhost:5173/about</loc>')
        ->toContain('<loc>http://localhost:5173/pages/custom</loc>')
        ->not->toContain(rawurlencode('مسودة'));
    expect(simplexml_load_string($xml))->not->toBeFalse();
});
