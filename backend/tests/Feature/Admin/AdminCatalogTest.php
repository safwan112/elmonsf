<?php

use App\Models\Category;
use App\Models\Coupon;
use App\Models\CouponRedemption;
use App\Models\Course;
use App\Models\Exam;
use App\Models\MediaAsset;
use App\Models\Order;
use App\Models\Product;
use App\Models\Question;
use App\Models\QuestionBank;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->admin = User::factory()->admin()->create();
});

it('restricts catalog administration to admins', function (string $method, string $uri) {
    $student = User::factory()->student()->create();

    $this->actingAs($student)->json($method, $uri)->assertForbidden();
})->with([
    ['GET', '/api/v1/admin/categories'],
    ['GET', '/api/v1/admin/products'],
    ['GET', '/api/v1/admin/coupons'],
    ['GET', '/api/v1/admin/questions'],
    ['GET', '/api/v1/admin/exams'],
    ['GET', '/api/v1/admin/payments'],
    ['GET', '/api/v1/admin/reviews'],
    ['GET', '/api/v1/admin/posts'],
    ['GET', '/api/v1/admin/settings'],
    ['GET', '/api/v1/admin/audit-logs'],
    ['POST', '/api/v1/admin/media'],
]);

it('manages categories with a two-level tree and safe deletes', function () {
    $parent = $this->actingAs($this->admin)->postJson('/api/v1/admin/categories', ['name' => 'القدرات', 'icon' => 'target'])
        ->assertCreated()->assertJsonPath('data.slug', 'القدرات')->json('data');
    $child = $this->actingAs($this->admin)->postJson('/api/v1/admin/categories', ['name' => 'الكمي', 'parent_id' => $parent['id']])
        ->assertCreated()->json('data');

    // No third level, and no self-parenting.
    $this->actingAs($this->admin)->postJson('/api/v1/admin/categories', ['name' => 'عميق', 'parent_id' => $child['id']])
        ->assertUnprocessable()->assertJsonValidationErrors('parent_id');
    $this->actingAs($this->admin)->putJson("/api/v1/admin/categories/{$parent['id']}", ['parent_id' => $parent['id']])
        ->assertUnprocessable();
    $this->actingAs($this->admin)->postJson('/api/v1/admin/categories', ['name' => 'x', 'icon' => '<svg>'])
        ->assertUnprocessable()->assertJsonValidationErrors('icon');

    // In use → 409; empty → deleted.
    Course::factory()->create(['category_id' => $child['id']]);
    $this->actingAs($this->admin)->deleteJson("/api/v1/admin/categories/{$parent['id']}")
        ->assertStatus(409)->assertJsonPath('code', 'category_in_use');
    $empty = Category::factory()->create();
    $this->actingAs($this->admin)->deleteJson("/api/v1/admin/categories/{$empty->id}")->assertOk();
    expect(Category::query()->find($empty->id))->toBeNull();
});

it('uploads re-encoded images and attaches them by id', function () {
    Storage::fake('public');

    $media = $this->actingAs($this->admin)->post('/api/v1/admin/media', [
        'file' => UploadedFile::fake()->image('cover.jpg', 2400, 1200),
    ], ['Accept' => 'application/json'])->assertCreated()->json('data');

    $asset = MediaAsset::query()->findOrFail($media['id']);
    Storage::disk('public')->assertExists($asset->path);
    expect($asset->mime_type)->toBe('image/webp')
        ->and($asset->width)->toBe(1920)
        ->and($asset->height)->toBe(960);

    $this->actingAs($this->admin)->post('/api/v1/admin/media', [
        'file' => UploadedFile::fake()->create('evil.svg', 1, 'image/svg+xml'),
    ], ['Accept' => 'application/json'])->assertUnprocessable();

    $product = $this->actingAs($this->admin)->postJson('/api/v1/admin/products', [
        'title' => 'ملخص', 'type' => 'ebook', 'price' => 29, 'cover_media_id' => $asset->id,
    ])->assertCreated()->json('data');
    expect(Product::query()->find($product['id'])->cover_path)->toBe($asset->path);

    // Arbitrary paths can't be injected.
    $this->actingAs($this->admin)->putJson("/api/v1/admin/products/{$product['id']}", ['cover_path' => '../../.env'])->assertOk();
    expect(Product::query()->find($product['id'])->cover_path)->toBe($asset->path);
});

it('manages products in SAR and publishes them', function () {
    $id = $this->actingAs($this->admin)->postJson('/api/v1/admin/products', [
        'title' => 'بنك أسئلة', 'type' => 'question_bank', 'price' => 79.9, 'compare_at_price' => 119,
    ])->assertCreated()
        ->assertJsonPath('data.price', 79.9)
        ->assertJsonPath('data.status.value', 'draft')
        ->json('data.id');
    expect(Product::query()->find($id)->price_amount)->toBe(7990);

    $slug = Product::query()->find($id)->slug;
    $this->getJson("/api/v1/products/{$slug}")->assertNotFound();

    $this->actingAs($this->admin)->putJson("/api/v1/admin/products/{$id}", ['status' => 'published'])
        ->assertOk()->assertJsonPath('data.status.value', 'published');
    $this->getJson("/api/v1/products/{$slug}")->assertOk();

    $this->actingAs($this->admin)->deleteJson("/api/v1/admin/products/{$id}")->assertOk();
    expect(Product::withTrashed()->find($id)->trashed())->toBeTrue();
});

it('validates coupons and keeps redeemed ones', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/admin/coupons', ['code' => 'BIG', 'type' => 'percent', 'value' => 150])
        ->assertUnprocessable()->assertJsonValidationErrors('value');
    $this->actingAs($this->admin)->postJson('/api/v1/admin/coupons', ['code' => 'bad code!', 'type' => 'percent', 'value' => 10])
        ->assertUnprocessable()->assertJsonValidationErrors('code');

    $fixed = $this->actingAs($this->admin)->postJson('/api/v1/admin/coupons', [
        'code' => 'save25', 'type' => 'fixed', 'value' => 25.5, 'min_subtotal' => 100,
    ])->assertCreated()->assertJsonPath('data.code', 'SAVE25')->assertJsonPath('data.value', 25.5)->json('data');
    $stored = Coupon::query()->find($fixed['id']);
    expect($stored->value)->toBe(2550)->and($stored->min_subtotal_amount)->toBe(10000);

    $this->actingAs($this->admin)->postJson('/api/v1/admin/coupons', ['code' => 'SAVE25', 'type' => 'percent', 'value' => 5])
        ->assertUnprocessable()->assertJsonValidationErrors('code');

    // Redeemed → deactivated instead of deleted.
    $order = Order::query()->create(['number' => 'ORD-T-1', 'user_id' => $this->admin->id, 'subtotal_amount' => 1, 'total_amount' => 1, 'billing_name' => 'x', 'billing_email' => 'x@example.com']);
    CouponRedemption::query()->create(['coupon_id' => $fixed['id'], 'user_id' => $this->admin->id, 'order_id' => $order->id, 'discount_amount' => 2550]);
    $this->actingAs($this->admin)->deleteJson("/api/v1/admin/coupons/{$fixed['id']}")->assertOk();
    expect(Coupon::query()->find($fixed['id'])->is_active)->toBeFalse();
});

it('edits questions with exactly one correct option, keeping option ids', function () {
    $bank = QuestionBank::factory()->create();

    $this->actingAs($this->admin)->postJson('/api/v1/admin/questions', [
        'question_bank_id' => $bank->id, 'body' => 'س؟',
        'options' => [['body' => 'أ', 'is_correct' => true], ['body' => 'ب', 'is_correct' => true]],
    ])->assertUnprocessable()->assertJsonPath('code', 'question_needs_correct');

    $question = $this->actingAs($this->admin)->postJson('/api/v1/admin/questions', [
        'question_bank_id' => $bank->id, 'body' => 'كم 2+2؟', 'explanation' => 'جمع', 'difficulty' => 'easy', 'topic' => 'حساب',
        'options' => [['body' => '4', 'is_correct' => true], ['body' => '5', 'is_correct' => false]],
    ])->assertCreated()->assertJsonCount(2, 'data.options')->json('data');
    expect($bank->refresh()->questions_count)->toBe(1);

    $keep = $question['options'][0]['id'];
    $updated = $this->actingAs($this->admin)->putJson("/api/v1/admin/questions/{$question['id']}", [
        'options' => [['id' => $keep, 'body' => 'أربعة', 'is_correct' => true], ['body' => 'ثلاثة', 'is_correct' => false], ['body' => 'ستة', 'is_correct' => false]],
    ])->assertOk()->json('data.options');
    expect($updated[0]['id'])->toBe($keep)->and($updated)->toHaveCount(3);

    $this->actingAs($this->admin)->getJson("/api/v1/admin/questions?bank_id={$bank->id}&search=".urlencode('2+2'))
        ->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.options.0.is_correct', true);
});

it('builds exams from questions and locks them once attempted', function () {
    $bank = QuestionBank::factory()->withQuestions(3)->create();
    $ids = $bank->questions()->pluck('id')->all();

    $exam = $this->actingAs($this->admin)->postJson('/api/v1/admin/exams', [
        'title' => 'اختبار تجريبي', 'duration_minutes' => 10, 'pass_percent' => 70, 'status' => 'published',
    ])->assertCreated()->assertJsonPath('data.questions_count', 0)->json('data');

    $this->actingAs($this->admin)->putJson("/api/v1/admin/exams/{$exam['id']}/questions", [
        'questions' => [['id' => $ids[2], 'points' => 2], ['id' => $ids[0]]],
    ])->assertOk()
        ->assertJsonPath('data.questions_count', 2)
        ->assertJsonPath('data.questions.0.id', $ids[2])
        ->assertJsonPath('data.questions.0.points', 2);

    // A student attempt locks the question list; deleting archives instead.
    $student = User::factory()->student()->create();
    $this->actingAs($student)->postJson("/api/v1/exams/{$exam['id']}/attempts")->assertCreated();

    $this->actingAs($this->admin)->putJson("/api/v1/admin/exams/{$exam['id']}/questions", ['questions' => [['id' => $ids[1]]]])
        ->assertStatus(409)->assertJsonPath('code', 'exam_has_attempts');
    $this->actingAs($this->admin)->deleteJson("/api/v1/admin/exams/{$exam['id']}")->assertOk();
    expect(Exam::query()->find($exam['id'])->status->value)->toBe('archived');

    // Questions used by exams are deactivated rather than deleted.
    $this->actingAs($this->admin)->deleteJson("/api/v1/admin/questions/{$ids[0]}")->assertOk();
    expect(Question::query()->find($ids[0])->is_active)->toBeFalse();
});
