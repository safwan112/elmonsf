<?php

namespace App\Models;

use App\Enums\QuestionDifficulty;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Question extends Model
{
    use HasFactory;

    protected $fillable = ['question_bank_id', 'type', 'body', 'explanation', 'difficulty', 'topic', 'is_active', 'sort_order'];

    /** The explanation reveals the answer: never serialised by accident. */
    protected $hidden = ['explanation'];

    protected function casts(): array
    {
        return [
            'difficulty' => QuestionDifficulty::class,
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::saved(fn (self $q) => $q->loadMissing('bank')->bank?->refreshQuestionsCount());
        static::deleted(fn (self $q) => $q->loadMissing('bank')->bank?->refreshQuestionsCount());
    }

    public function bank(): BelongsTo
    {
        return $this->belongsTo(QuestionBank::class, 'question_bank_id');
    }

    public function options(): HasMany
    {
        return $this->hasMany(QuestionOption::class)->orderBy('sort_order')->orderBy('id');
    }

    public function correctOption(): ?QuestionOption
    {
        return $this->options->firstWhere('is_correct', true);
    }
}
