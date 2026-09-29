<?php

namespace App\Models;

use App\Enums\CourseLevel;
use App\Enums\PublishStatus;
use App\Models\Concerns\HasPublishStatus;
use App\Models\Concerns\Searchable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Course extends Model
{
    use HasFactory, HasPublishStatus, Searchable, SoftDeletes;

    protected $fillable = [
        'category_id', 'instructor_id', 'title', 'slug', 'subtitle', 'description', 'cover_path',
        'level', 'language', 'status', 'is_featured', 'published_at', 'outcomes', 'requirements',
        'seo_title', 'seo_description',
    ];

    protected $hidden = ['search_text'];

    protected function casts(): array
    {
        return [
            'level' => CourseLevel::class,
            'status' => PublishStatus::class,
            'is_featured' => 'boolean',
            'published_at' => 'datetime',
            'outcomes' => 'array',
            'requirements' => 'array',
            'lessons_count' => 'integer',
            'duration_seconds' => 'integer',
            'students_count' => 'integer',
            'rating_avg' => 'float',
            'rating_count' => 'integer',
        ];
    }

    protected function searchableFragments(): array
    {
        return [
            $this->title,
            $this->subtitle,
            $this->description,
            implode(' ', $this->outcomes ?? []),
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function instructor(): BelongsTo
    {
        return $this->belongsTo(Instructor::class);
    }

    public function plans(): HasMany
    {
        return $this->hasMany(CoursePlan::class)->orderBy('sort_order')->orderBy('price_amount');
    }

    public function activePlans(): HasMany
    {
        return $this->plans()->where('is_active', true);
    }

    /** Cheapest active plan, used for "from" prices on cards. */
    public function cheapestPlan(): HasOne
    {
        return $this->hasOne(CoursePlan::class)->ofMany(
            ['price_amount' => 'min'],
            fn ($q) => $q->where('is_active', true),
        );
    }

    public function sections(): HasMany
    {
        return $this->hasMany(Section::class)->orderBy('sort_order')->orderBy('id');
    }

    public function lessons(): HasMany
    {
        return $this->hasMany(Lesson::class);
    }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }

    public function coverUrl(): ?string
    {
        return $this->cover_path ? Storage::disk('public')->url($this->cover_path) : null;
    }

    /**
     * Recompute denormalised curriculum counters.
     */
    public function refreshCurriculumStats(): void
    {
        $stats = $this->lessons()
            ->where('is_published', true)
            ->selectRaw('count(*) as c, coalesce(sum(duration_seconds), 0) as d')
            ->first();

        $this->forceFill([
            'lessons_count' => (int) $stats->c,
            'duration_seconds' => (int) $stats->d,
        ])->saveQuietly();
    }
}
