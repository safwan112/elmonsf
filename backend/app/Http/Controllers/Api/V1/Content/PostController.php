<?php

namespace App\Http\Controllers\Api\V1\Content;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\ListPostsRequest;
use App\Http\Resources\Content\PostResource;
use App\Models\Post;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PostController extends Controller
{
    public function index(ListPostsRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();
        $search = trim((string) ($filters['search'] ?? ''));

        $query = Post::query()
            ->published()
            ->with(['author', 'tags'])
            ->when($filters['tag'] ?? null, fn (Builder $q, string $tag) => $q->whereHas(
                'tags',
                fn (Builder $t) => $t->where('slug', $tag),
            ));

        if ($search !== '') {
            $query->search($search);
        } else {
            $query->orderByDesc('published_at');
        }
        $query->orderByDesc('id');

        return PostResource::collection($query->paginate($request->integer('per_page', 9))->withQueryString());
    }

    public function show(string $slug): JsonResponse
    {
        $post = Post::query()->published()->where('slug', $slug)->with(['author', 'tags'])->firstOrFail();

        $more = Post::query()
            ->published()
            ->whereKeyNot($post->id)
            ->orderByDesc('published_at')
            ->limit(3)
            ->get();

        return (new PostResource($post))
            ->detailed()
            ->additional(['more' => PostResource::collection($more)])
            ->response();
    }
}
