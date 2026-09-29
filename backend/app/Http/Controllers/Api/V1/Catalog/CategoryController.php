<?php

namespace App\Http\Controllers\Api\V1\Catalog;

use App\Http\Controllers\Controller;
use App\Http\Resources\Catalog\CategoryResource;
use App\Models\Category;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CategoryController extends Controller
{
    /**
     * Active top-level categories with their active children and counts of
     * published courses/products.
     */
    public function index(): AnonymousResourceCollection
    {
        $counts = [
            'courses' => fn (Builder $q) => $q->published(),
            'products' => fn (Builder $q) => $q->published(),
        ];

        $categories = Category::query()
            ->active()
            ->whereNull('parent_id')
            ->withCount($counts)
            ->with(['children' => fn ($q) => $q->active()->withCount($counts)])
            ->ordered()
            ->get();

        return CategoryResource::collection($categories);
    }

    public function show(string $slug): CategoryResource
    {
        $category = Category::query()
            ->active()
            ->where('slug', $slug)
            ->withCount(['courses' => fn (Builder $q) => $q->published()])
            ->with(['children' => fn ($q) => $q->active()->ordered(), 'parent'])
            ->firstOrFail();

        return new CategoryResource($category);
    }
}
