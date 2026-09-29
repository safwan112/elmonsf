<?php

use App\Enums\CourseLevel;
use App\Models\Category;
use App\Models\Course;
use App\Models\Lesson;

it('lists only published courses with card data', function () {
    Course::factory()->withPlans([19900, 29900])->create(['title' => 'منشورة']);
    Course::factory()->draft()->withPlans()->create();
    Course::factory()->scheduled()->withPlans()->create();

    $this->getJson('/api/v1/courses')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'منشورة')
        ->assertJsonPath('data.0.starting_plan.price.amount', 199)
        ->assertJsonPath('data.0.starting_plan.price.amount_minor', 19900)
        ->assertJsonStructure(['data' => [['id', 'slug', 'title', 'cover_url', 'level' => ['value', 'label'], 'category', 'instructor', 'lessons_count', 'rating']], 'meta', 'links']);
});

it('filters by category including sub-categories', function () {
    $parent = Category::factory()->create(['slug' => 'parent']);
    $child = Category::factory()->create(['slug' => 'child', 'parent_id' => $parent->id]);
    $other = Category::factory()->create();

    Course::factory()->for($parent)->create(['title' => 'في الأب']);
    Course::factory()->for($child)->create(['title' => 'في الابن']);
    Course::factory()->for($other)->create(['title' => 'أخرى']);

    $titles = collect($this->getJson('/api/v1/courses?category=parent')->assertOk()->json('data'))->pluck('title');
    expect($titles->all())->toEqualCanonicalizing(['في الابن', 'في الأب']);

    $this->getJson('/api/v1/courses?category=child')->assertJsonCount(1, 'data');
    $this->getJson('/api/v1/courses?category=unknown')->assertJsonCount(0, 'data');
});

it('filters by level, price range and featured flag', function () {
    Course::factory()->withPlans([9900])->create(['level' => CourseLevel::Beginner, 'title' => 'رخيصة']);
    Course::factory()->withPlans([49900])->featured()->create(['level' => CourseLevel::Advanced, 'title' => 'غالية']);

    $this->getJson('/api/v1/courses?level=beginner')->assertJsonCount(1, 'data')->assertJsonPath('data.0.title', 'رخيصة');
    $this->getJson('/api/v1/courses?min_price=100')->assertJsonCount(1, 'data')->assertJsonPath('data.0.title', 'غالية');
    $this->getJson('/api/v1/courses?max_price=100')->assertJsonCount(1, 'data')->assertJsonPath('data.0.title', 'رخيصة');
    $this->getJson('/api/v1/courses?featured=1')->assertJsonCount(1, 'data')->assertJsonPath('data.0.title', 'غالية');
});

it('sorts by price and popularity', function () {
    Course::factory()->withPlans([29900])->create(['title' => 'B']);
    Course::factory()->withPlans([9900])->create(['title' => 'A']);
    Course::factory()->create(['title' => 'no-plan']);

    expect(collect($this->getJson('/api/v1/courses?sort=price_asc')->json('data'))->pluck('title')->all())->toBe(['A', 'B', 'no-plan'])
        ->and(collect($this->getJson('/api/v1/courses?sort=price_desc')->json('data'))->pluck('title')->all())->toBe(['B', 'A', 'no-plan']);
});

it('searches arabic text forgivingly and ranks matches', function () {
    Course::factory()->create(['title' => 'تأسيس القسم الكمي', 'description' => 'حساب وجبر']);
    Course::factory()->create(['title' => 'اللفظي الشامل', 'description' => 'تناظر لفظي']);

    $this->getJson('/api/v1/courses?search='.urlencode('تاسيس الكمى'))
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'تأسيس القسم الكمي');

    // LIKE wildcards in user input are literal.
    $this->getJson('/api/v1/courses?search='.urlencode('%%'))->assertOk()->assertJsonCount(2, 'data');
});

it('validates catalog filters', function () {
    $this->getJson('/api/v1/courses?level=expert&sort=hack&per_page=500&min_price=50&max_price=10')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['level', 'sort', 'per_page', 'max_price']);
});

it('shows a course page with plans, curriculum and related courses', function () {
    $course = Course::factory()->withPlans([19900, 29900])->withCurriculum(2, 3)->create(['slug' => 'دورة-تجريبية']);
    Course::factory()->for($course->category)->create(['title' => 'ذات صلة']);

    $response = $this->getJson('/api/v1/courses/'.rawurlencode('دورة-تجريبية'))
        ->assertOk()
        ->assertJsonPath('data.slug', 'دورة-تجريبية')
        ->assertJsonCount(2, 'data.plans')
        ->assertJsonCount(2, 'data.curriculum')
        ->assertJsonCount(3, 'data.curriculum.0.lessons')
        ->assertJsonPath('data.curriculum.0.lessons.0.is_preview', true)
        ->assertJsonPath('data.lessons_count', 6)
        ->assertJsonPath('related.0.title', 'ذات صلة')
        ->assertJsonStructure(['data' => ['description_html', 'outcomes', 'requirements', 'seo' => ['title', 'description'], 'instructor' => ['bio_html']]]);

    // Paid lesson content never leaks into the public course page.
    expect($response->getContent())->not->toContain('"content"')->not->toContain('video_ref');
});

it('hides unpublished courses', function () {
    $draft = Course::factory()->draft()->create();

    $this->getJson("/api/v1/courses/{$draft->slug}")->assertNotFound();
});

it('serves preview lessons only', function () {
    $course = Course::factory()->withCurriculum(1, 2)->create();
    [$preview, $paid] = $course->lessons()->orderBy('sort_order')->get()->all();

    $this->getJson("/api/v1/courses/{$course->slug}/lessons/{$preview->id}/preview")
        ->assertOk()
        ->assertJsonPath('data.id', $preview->id)
        ->assertJsonStructure(['data' => ['content_html', 'video_embed_url']]);

    $this->getJson("/api/v1/courses/{$course->slug}/lessons/{$paid->id}/preview")->assertNotFound();

    // A preview lesson of another course cannot be read through this course.
    $other = Course::factory()->withCurriculum(1, 1)->create();
    $otherPreview = $other->lessons()->first();
    $this->getJson("/api/v1/courses/{$course->slug}/lessons/{$otherPreview->id}/preview")->assertNotFound();
});

it('keeps lesson counters in sync with the curriculum', function () {
    $course = Course::factory()->withCurriculum(1, 2)->create();
    expect($course->fresh()->lessons_count)->toBe(2);

    Lesson::query()->where('course_id', $course->id)->first()->delete();
    expect($course->fresh()->lessons_count)->toBe(1);
});

it('lists categories as a tree with published course counts', function () {
    $parent = Category::factory()->create(['name' => 'القدرات']);
    $child = Category::factory()->create(['parent_id' => $parent->id]);
    Category::factory()->inactive()->create();
    Course::factory()->for($parent)->create();
    Course::factory()->for($child)->create();
    Course::factory()->for($child)->draft()->create();

    $this->getJson('/api/v1/categories')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'القدرات')
        ->assertJsonPath('data.0.courses_count', 1)
        ->assertJsonPath('data.0.children.0.courses_count', 1);

    $this->getJson("/api/v1/categories/{$child->slug}")->assertOk()->assertJsonPath('data.parent.name', 'القدرات');
});
