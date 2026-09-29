<?php

namespace App\Models;

use App\Enums\PublishStatus;
use App\Models\Concerns\HasPublishStatus;
use App\Models\Concerns\Searchable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Post extends Model
{
    use HasFactory, HasPublishStatus, Searchable, SoftDeletes;

    protected $fillable = [
        'author_id', 'title', 'slug', 'excerpt', 'body', 'cover_path', 'status', 'published_at',
        'seo_title', 'seo_description',
    ];

    protected $hidden = ['search_text'];

    protected function casts(): array
    {
        return [
            'status' => PublishStatus::class,
            'published_at' => 'datetime',
            'reading_minutes' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        // ~200 words per minute for Arabic prose.
        static::saving(function (self $post) {
            $words = count(preg_split('/\s+/u', trim(strip_tags((string) $post->body))) ?: []);
            $post->reading_minutes = max(1, (int) ceil($words / 200));
        });
    }

    protected function searchableFragments(): array
    {
        return [$this->title, $this->excerpt, $this->body];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }

    public function coverUrl(): ?string
    {
        return $this->cover_path ? Storage::disk('public')->url($this->cover_path) : null;
    }
}
