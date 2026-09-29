<?php

namespace App\Models;

use App\Enums\PublishStatus;
use App\Models\Concerns\HasPublishStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Page extends Model
{
    use HasFactory, HasPublishStatus;

    protected $fillable = ['title', 'slug', 'body', 'status', 'seo_title', 'seo_description'];

    protected function casts(): array
    {
        return ['status' => PublishStatus::class];
    }

    protected function usesPublishedAt(): bool
    {
        return false;
    }
}
