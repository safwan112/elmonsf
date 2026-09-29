<?php

namespace App\Models;

use App\Enums\LessonType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lesson extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_id', 'section_id', 'title', 'type', 'content', 'video_provider', 'video_ref',
        'duration_seconds', 'is_preview', 'is_published', 'sort_order',
    ];

    /** Paid content is never serialised by accident. */
    protected $hidden = ['content', 'video_ref'];

    protected function casts(): array
    {
        return [
            'type' => LessonType::class,
            'duration_seconds' => 'integer',
            'is_preview' => 'boolean',
            'is_published' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        // Keep the course's lesson count and total duration accurate.
        static::saved(fn (self $lesson) => $lesson->loadMissing('course')->course?->refreshCurriculumStats());
        static::deleted(fn (self $lesson) => $lesson->loadMissing('course')->course?->refreshCurriculumStats());
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class)->orderBy('sort_order');
    }
}
