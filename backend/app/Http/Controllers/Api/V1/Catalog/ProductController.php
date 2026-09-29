<?php

namespace App\Http\Controllers\Api\V1\Catalog;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\ListProductsRequest;
use App\Http\Resources\Catalog\ProductResource;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductController extends Controller
{
    public function index(ListProductsRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();
        $search = trim((string) ($filters['search'] ?? ''));
        $sort = $filters['sort'] ?? ($search !== '' ? 'relevance' : 'newest');

        $query = Product::query()
            ->published()
            ->with('category')
            ->when($filters['category'] ?? null, function (Builder $q, string $slug) {
                $category = Category::query()->active()->where('slug', $slug)->with('children')->first();
                $q->whereIn('category_id', $category ? [$category->id, ...$category->children->pluck('id')] : [0]);
            })
            ->when($filters['type'] ?? null, fn (Builder $q, string $type) => $q->where('type', $type))
            ->when($request->boolean('featured'), fn (Builder $q) => $q->where('is_featured', true));

        if ($search !== '') {
            $query->search($search);
        }

        match ($sort) {
            'price_asc' => $query->orderBy('price_amount'),
            'price_desc' => $query->orderByDesc('price_amount'),
            'relevance' => null,
            default => $query->orderByDesc('published_at'),
        };
        $query->orderByDesc('id');

        return ProductResource::collection(
            $query->paginate($request->integer('per_page', 12))->withQueryString()
        );
    }

    public function show(string $slug): JsonResponse
    {
        $product = Product::query()->published()->where('slug', $slug)->with('category')->firstOrFail();

        $related = Product::query()
            ->published()
            ->whereKeyNot($product->id)
            ->where(fn (Builder $q) => $q->where('type', $product->type)->orWhere('category_id', $product->category_id))
            ->with('category')
            ->orderByDesc('is_featured')
            ->limit(3)
            ->get();

        return (new ProductResource($product))
            ->detailed()
            ->additional(['related' => ProductResource::collection($related)])
            ->response();
    }
}
