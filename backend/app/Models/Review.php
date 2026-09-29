<?php

namespace App\Models;

use App\Enums\ReviewStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    protected $fillable = ['user_id', 'course_id', 'rating', 'comment', 'status', 'moderated_by', 'moderated_at'];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'status' => ReviewStatus::class,
            'moderated_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        // Published ratings drive the course's average.
        static::saved(fn (self $review) => Course::query()->find($review->course_id)?->refreshRating());
        static::deleted(fn (self $review) => Course::query()->find($review->course_id)?->refreshRating());
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', ReviewStatus::Approved);
    }
}
