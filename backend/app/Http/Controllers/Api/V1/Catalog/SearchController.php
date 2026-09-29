<?php

namespace App\Http\Controllers\Api\V1\Catalog;

use App\Http\Controllers\Controller;
use App\Http\Resources\Catalog\CourseListResource;
use App\Http\Resources\Catalog\ProductResource;
use App\Http\Resources\Content\PostResource;
use App\Models\Course;
use App\Models\Post;
use App\Models\Product;
use App\Support\ArabicText;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Site-wide search across courses, products and blog posts.
 */
class SearchController extends Controller
{
    public const PER_TYPE = 6;

    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate(['q' => ['required', 'string', 'min:2', 'max:100']]);
        $q = $validated['q'];

        if (ArabicText::terms($q) === []) {
            return response()->json(['data' => ['courses' => [], 'products' => [], 'posts' => []], 'meta' => ['query' => $q, 'total' => 0]]);
        }

        $courses = Course::query()->published()->search($q)->with(['category', 'instructor', 'cheapestPlan'])->limit(self::PER_TYPE)->get();
        $products = Product::query()->published()->search($q)->with('category')->limit(self::PER_TYPE)->get();
        $posts = Post::query()->published()->search($q)->limit(self::PER_TYPE)->get();

        return response()->json([
            'data' => [
                'courses' => CourseListResource::collection($courses),
                'products' => ProductResource::collection($products),
                'posts' => PostResource::collection($posts),
            ],
            'meta' => [
                'query' => $q,
                'total' => $courses->count() + $products->count() + $posts->count(),
            ],
        ]);
    }
}
