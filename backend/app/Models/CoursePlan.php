<?php

namespace App\Models;

use App\Support\Money;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CoursePlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_id', 'name', 'duration_days', 'price_amount', 'compare_at_amount',
        'currency', 'is_active', 'is_default', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'duration_days' => 'integer',
            'price_amount' => 'integer',
            'compare_at_amount' => 'integer',
            'is_active' => 'boolean',
            'is_default' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /** Percentage saved versus the compare-at price, if any. */
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
