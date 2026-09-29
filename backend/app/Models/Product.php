<?php

namespace App\Models;

use App\Enums\ProductType;
use App\Enums\PublishStatus;
use App\Models\Concerns\HasPublishStatus;
use App\Models\Concerns\Searchable;
use App\Support\Money;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Product extends Model
{
    use HasFactory, HasPublishStatus, Searchable, SoftDeletes;

    protected $fillable = [
        'category_id', 'title', 'slug', 'type', 'subtitle', 'description', 'cover_path',
        'price_amount', 'compare_at_amount', 'currency', 'status', 'is_featured', 'published_at',
        'file_disk', 'file_path', 'seo_title', 'seo_description',
    ];

    protected $hidden = ['search_text', 'file_disk', 'file_path'];

    protected function casts(): array
    {
        return [
            'type' => ProductType::class,
            'status' => PublishStatus::class,
            'price_amount' => 'integer',
            'compare_at_amount' => 'integer',
            'is_featured' => 'boolean',
            'published_at' => 'datetime',
        ];
    }

    protected function searchableFragments(): array
    {
        return [$this->title, $this->subtitle, $this->description];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }

    public function coverUrl(): ?string
    {
        return $this->cover_path ? Storage::disk('public')->url($this->cover_path) : null;
    }

    public function discountPercent(): ?int
    {
        if (! $this->compare_at_amount || $this->compare_at_amount <= $this->price_amount) {
            return null;
        }

        return (int) round(100 - ($this->price_amount / $this->compare_at_amount * 100));
    }

    /**
     * @return array<string, mixed>
     */
    public function priceArray(): array
    {
        return [
            'price' => Money::present($this->price_amount, $this->currency),
            'compare_at_price' => Money::present($this->compare_at_amount, $this->currency),
            'discount_percent' => $this->discountPercent(),
        ];
    }
}
