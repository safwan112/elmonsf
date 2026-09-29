<?php

use App\Models\Product;
use App\Models\ProductEntitlement;
use App\Models\QuestionBank;
use App\Models\User;

beforeEach(function () {
    $this->student = User::factory()->student()->create();
    $this->free = QuestionBank::factory()->withQuestions(4)->create(['title' => 'بنك مجاني', 'sort_order' => 0]);
    $this->product = Product::factory()->create(['title' => 'بنك مدفوع']);
    $this->paid = QuestionBank::factory()->withQuestions(3)->create(['title' => 'بنك مدفوع', 'product_id' => $this->product->id, 'sort_order' => 1]);
});

function grantProduct(User $user, Product $product): void
{
    ProductEntitlement::query()->create(['user_id' => $user->id, 'product_id' => $product->id, 'granted_at' => now()]);
}

it('lists banks with lock state and what unlocks them', function () {
    $this->actingAs($this->student)->getJson('/api/v1/question-banks')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.is_unlocked', true)
        ->assertJsonPath('data.0.questions_count', 4)
        ->assertJsonPath('data.1.is_unlocked', false)
        ->assertJsonPath('data.1.unlock.product.slug', $this->product->slug);
});

it('locks paid banks until the product is owned', function () {
    $this->actingAs($this->student)->getJson("/api/v1/question-banks/{$this->paid->id}/questions")
        ->assertForbidden()->assertJsonPath('code', 'content_locked');
    $q = $this->paid->questions()->first();
    $this->actingAs($this->student)->postJson("/api/v1/question-banks/{$this->paid->id}/questions/{$q->id}/answer", ['option_id' => correctOptionId($q->id)])
        ->assertForbidden();

    grantProduct($this->student, $this->product);
    $this->actingAs($this->student)->getJson("/api/v1/question-banks/{$this->paid->id}/questions")
        ->assertOk()->assertJsonCount(3, 'data');

    // Revoked (refunded) entitlements lock it again.
    ProductEntitlement::query()->update(['revoked_at' => now()]);
    $this->actingAs($this->student)->getJson("/api/v1/question-banks/{$this->paid->id}/questions")->assertForbidden();
});

it('hides solutions until the student answers, then gives instant feedback', function () {
    $response = $this->actingAs($this->student)->getJson("/api/v1/question-banks/{$this->free->id}/questions")
        ->assertOk()
        ->assertJsonCount(4, 'data')
        ->assertJsonPath('data.0.practice', null)
        ->assertJsonPath('meta.total', 4);
    expect($response->getContent())->not->toContain('is_correct')->and($response->getContent())->not->toContain('explanation');

    $q = $this->free->questions()->orderBy('sort_order')->first();
    $url = "/api/v1/question-banks/{$this->free->id}/questions/{$q->id}/answer";

    $this->actingAs($this->student)->postJson($url, ['option_id' => wrongOptionId($q->id)])
        ->assertOk()
        ->assertJsonPath('data.is_correct', false)
        ->assertJsonPath('data.correct_option_id', correctOptionId($q->id))
        ->assertJsonStructure(['data' => ['explanation_html']]);

    $this->actingAs($this->student)->postJson($url, ['option_id' => correctOptionId($q->id)])
        ->assertOk()->assertJsonPath('data.is_correct', true);

    $this->actingAs($this->student)->getJson("/api/v1/question-banks/{$this->free->id}/questions")
        ->assertJsonPath('data.0.practice.is_correct', true)
        ->assertJsonPath('data.0.practice.attempts', 2)
        ->assertJsonPath('data.0.practice.correct_option_id', correctOptionId($q->id));

    $this->actingAs($this->student)->getJson("/api/v1/question-banks/{$this->free->id}")
        ->assertJsonPath('data.stats.answered', 1)
        ->assertJsonPath('data.stats.correct', 1);
});

it('filters by topic, difficulty and answer status', function () {
    $questions = $this->free->questions()->orderBy('sort_order')->get();
    $this->actingAs($this->student)->postJson("/api/v1/question-banks/{$this->free->id}/questions/{$questions[0]->id}/answer", ['option_id' => wrongOptionId($questions[0]->id)]);
    $this->actingAs($this->student)->postJson("/api/v1/question-banks/{$this->free->id}/questions/{$questions[1]->id}/answer", ['option_id' => correctOptionId($questions[1]->id)]);

    $base = "/api/v1/question-banks/{$this->free->id}/questions";
    $this->actingAs($this->student)->getJson("{$base}?status=unanswered")->assertJsonPath('meta.total', 2);
    $this->actingAs($this->student)->getJson("{$base}?status=incorrect")->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.id', $questions[0]->id);
    $this->actingAs($this->student)->getJson("{$base}?status=correct")->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.id', $questions[1]->id);
    $this->actingAs($this->student)->getJson("{$base}?difficulty=hard")->assertJsonPath('meta.total', 2);
    $this->actingAs($this->student)->getJson("{$base}?topic=".urlencode('الجبر'))->assertJsonPath('meta.total', 2);
    $this->actingAs($this->student)->getJson("{$base}?status=bogus&difficulty=impossible")->assertUnprocessable()
        ->assertJsonValidationErrors(['status', 'difficulty']);

    $this->actingAs($this->student)->getJson("/api/v1/question-banks/{$this->free->id}")
        ->assertJsonCount(2, 'data.topics');
});

it('rejects options and questions from elsewhere', function () {
    $q = $this->free->questions()->first();
    $other = $this->paid->questions()->first();

    $this->actingAs($this->student)->postJson("/api/v1/question-banks/{$this->free->id}/questions/{$q->id}/answer", ['option_id' => correctOptionId($other->id)])
        ->assertUnprocessable()->assertJsonValidationErrors('option_id');
    $this->actingAs($this->student)->postJson("/api/v1/question-banks/{$this->free->id}/questions/{$other->id}/answer", ['option_id' => correctOptionId($other->id)])
        ->assertNotFound();
});

it('hides inactive banks', function () {
    $this->free->update(['is_active' => false]);

    $this->actingAs($this->student)->getJson('/api/v1/question-banks')->assertJsonCount(1, 'data');
    $this->actingAs($this->student)->getJson("/api/v1/question-banks/{$this->free->id}")->assertNotFound();
});
