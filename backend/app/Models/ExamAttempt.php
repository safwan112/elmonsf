<?php

namespace App\Models;

use App\Enums\AttemptStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property array<int, array{q: int, o: list<int>, p: int}> $layout
 */
class ExamAttempt extends Model
{
    protected $fillable = [
        'user_id', 'exam_id', 'status', 'layout', 'started_at', 'deadline_at', 'submitted_at',
        'score_points', 'max_points', 'percent', 'passed', 'correct_count',
    ];

    protected function casts(): array
    {
        return [
            'status' => AttemptStatus::class,
            'layout' => 'array',
            'started_at' => 'datetime',
            'deadline_at' => 'datetime',
            'submitted_at' => 'datetime',
            'score_points' => 'integer',
            'max_points' => 'integer',
            'percent' => 'float',
            'passed' => 'boolean',
            'correct_count' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function answers(): HasMany
    {
        return $this->hasMany(AttemptAnswer::class);
    }

    /** @return list<int> */
    public function questionIds(): array
    {
        return array_map(fn (array $item) => (int) $item['q'], $this->layout);
    }

    public function isInProgress(): bool
    {
        return $this->status === AttemptStatus::InProgress;
    }

    /** Past the deadline (plus a small grace period for in-flight saves). */
    public function isOverdue(int $graceSeconds = 0): bool
    {
        return $this->deadline_at !== null && now()->greaterThan($this->deadline_at->copy()->addSeconds($graceSeconds));
    }
}
