<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LessonProgress extends Model
{
    protected $table = 'lesson_progress';

    protected $fillable = ['user_id', 'course_id', 'lesson_id', 'position_seconds', 'completed_at', 'last_viewed_at'];

    protected function casts(): array
    {
        return [
            'position_seconds' => 'integer',
            'completed_at' => 'datetime',
            'last_viewed_at' => 'datetime',
        ];
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }
}
