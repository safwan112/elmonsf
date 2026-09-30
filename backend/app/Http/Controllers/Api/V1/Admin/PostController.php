<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\PublishStatus;
use App\Http\Controllers\Api\V1\Admin\Concerns\AdminCrud;
use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\Tag;
use App\Support\Slug;
use App\Support\UniqueSlug;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PostController extends Controller
{
    use AdminCrud;

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::enum(PublishStatus::class)],
        ]);

        $page = Post::query()
            ->with(['author:id,name', 'tags'])
            ->when($filters['search'] ?? null, fn ($q, $s) => $q->whereLike('title', $this->like($s)))
            ->when($filters['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->latest('updated_at')->orderByDesc('id')
            ->paginate($this->perPage($request))
            ->withQueryString();

        return $this->paginated($page, fn (Post $p) => $this->present($p));
    }

    public function show(Post $post): JsonResponse
    {
        return response()->json(['data' => $this->present($post->load(['author:id,name', 'tags']))]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->prepare($this->validated($request));
        $data['slug'] = UniqueSlug::for(Post::class, $data['slug'] ?? $data['title']);
        $data['author_id'] = $request->user()->id;

        $post = DB::transaction(function () use ($data) {
            $tags = $data['tags'] ?? null;
            unset($data['tags']);
            $post = Post::query()->create($data)->refresh();
            $this->syncTags($post, $tags);

            return $post;
        });
        $this->audit('post.created', $post);

        return response()->json(['data' => $this->present($post->load(['author:id,name', 'tags']))], 201);
    }

    public function update(Request $request, Post $post): JsonResponse
    {
        $data = $this->prepare($this->validated($request, true), $post);
        if (array_key_exists('slug', $data)) {
            $data['slug'] = UniqueSlug::for(Post::class, $data['slug'] ?: ($data['title'] ?? $post->title), $post->id);
        }

        DB::transaction(function () use ($post, $data) {
            $tags = $data['tags'] ?? null;
            unset($data['tags']);
            $post->update($data);
            $this->syncTags($post, $tags);
        });
        $this->audit('post.updated', $post, ['fields' => array_keys($data)]);

        return response()->json(['data' => $this->present($post->load(['author:id,name', 'tags']))]);
    }

    public function destroy(Post $post): JsonResponse
    {
        $post->delete();
        $this->audit('post.deleted', $post, ['title' => $post->title]);

        return response()->json(['message' => __('admin.deleted')]);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, bool $partial = false): array
    {
        return $request->validate([
            'title' => [$partial ? 'sometimes' : 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:120'],
            'excerpt' => ['sometimes', 'nullable', 'string', 'max:500'],
            'body' => [$partial ? 'sometimes' : 'required', 'string', 'max:100000'],
            'status' => ['sometimes', Rule::enum(PublishStatus::class)],
            'published_at' => ['sometimes', 'nullable', 'date'],
            'cover_media_id' => ['sometimes', 'nullable', 'integer', 'exists:media_assets,id'],
            'tags' => ['sometimes', 'array', 'max:10'],
            'tags.*' => ['string', 'max:40'],
            'seo_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'seo_description' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function prepare(array $data, ?Post $post = null): array
    {
        $data = $this->applyMedia($data, 'cover_media_id', 'cover_path');
        $status = $data['status'] ?? $post?->status->value;
        if ($status === PublishStatus::Published->value && empty($data['published_at']) && ! $post?->published_at) {
            $data['published_at'] = now();
        }

        return $data;
    }

    /** @param list<string>|null $names */
    private function syncTags(Post $post, ?array $names): void
    {
        if ($names === null) {
            return;
        }
        $ids = collect($names)->map(fn ($n) => trim($n))->filter()->unique()
            ->map(fn ($name) => Tag::query()->firstOrCreate(['slug' => Slug::make($name)], ['name' => $name])->id);
        $post->tags()->sync($ids);
    }

    /** @return array<string, mixed> */
    private function present(Post $p): array
    {
        return [
            'id' => $p->id,
            'title' => $p->title,
            'slug' => $p->slug,
            'excerpt' => $p->excerpt,
            'body' => $p->body,
            'cover_url' => $p->coverUrl(),
            'status' => ['value' => $p->status->value, 'label' => $p->status->label()],
            'published_at' => $p->published_at?->toIso8601String(),
            'reading_minutes' => $p->reading_minutes,
            'author' => $p->author ? ['id' => $p->author->id, 'name' => $p->author->name] : null,
            'tags' => $p->tags->pluck('name')->values(),
            'seo_title' => $p->seo_title,
            'seo_description' => $p->seo_description,
            'updated_at' => $p->updated_at?->toIso8601String(),
        ];
    }
}
