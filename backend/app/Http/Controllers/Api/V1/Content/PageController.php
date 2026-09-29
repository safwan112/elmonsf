<?php

namespace App\Http\Controllers\Api\V1\Content;

use App\Http\Controllers\Controller;
use App\Http\Resources\Content\PageResource;
use App\Models\Page;

class PageController extends Controller
{
    public function show(string $slug): PageResource
    {
        return new PageResource(Page::query()->published()->where('slug', $slug)->firstOrFail());
    }
}
