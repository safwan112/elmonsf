<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A student's latest answer to a question-bank question in practice mode. */
class QuestionPractice extends Model
{
    protected $table = 'question_practice';

    protected $fillable = ['user_id', 'question_id', 'question_bank_id', 'option_id', 'is_correct', 'attempts', 'answered_at'];

    protected function casts(): array
    {
        return [
            'is_correct' => 'boolean',
            'attempts' => 'integer',
            'answered_at' => 'datetime',
        ];
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }
}
