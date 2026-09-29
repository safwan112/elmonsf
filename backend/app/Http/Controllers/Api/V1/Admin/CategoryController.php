<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Exceptions\DomainException;
use App\Http\Controllers\Api\V1\Admin\Concerns\AdminCrud;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Support\UniqueSlug;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    use AdminCrud;

    public function index(): JsonResponse
    {
        $categories = Category::query()
            ->withCount(['courses', 'products', 'children'])
            ->orderByRaw('coalesce(parent_id, id), parent_id nulls first, sort_order, id')
            ->get();

        return response()->json(['data' => $categories->map(fn (Category $c) => $this->present($c))->values()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $data['slug'] = UniqueSlug::for(Category::class, $data['slug'] ?? $data['name']);

        $category = Category::query()->create($data)->refresh();
        $this->audit('category.created', $category);

        return response()->json(['data' => $this->present($category->loadCount(['courses', 'products', 'children']))], 201);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $data = $this->validated($request, $category);
        if (array_key_exists('slug', $data)) {
            $data['slug'] = UniqueSlug::for(Category::class, $data['slug'] ?: ($data['name'] ?? $category->name), $category->id);
        }

        $category->update($data);
        $this->audit('category.updated', $category, ['fields' => array_keys($data)]);

        return response()->json(['data' => $this->present($category->loadCount(['courses', 'products', 'children']))]);
    }

    public function destroy(Category $category): JsonResponse
    {
        $category->loadCount(['courses', 'products', 'children']);
        if ($category->courses_count + $category->products_count + $category->children_count > 0) {
            throw new DomainException(__('admin.category_in_use'), 'category_in_use', 409);
        }

        $category->delete();
        $this->audit('category.deleted', $category, ['name' => $category->name]);

        return response()->json(['message' => __('admin.deleted')]);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?Category $category = null): array
    {
        $partial = $category !== null;

        $data = $request->validate([
            'name' => [$partial ? 'sometimes' : 'required', 'string', 'max:120'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:120'],
            // Two levels only: a parent must itself be top-level.
            'parent_id' => ['sometimes', 'nullable', 'integer', Rule::exists('categories', 'id')->whereNull('parent_id'), Rule::notIn([$category?->id])],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'icon' => ['sometimes', 'nullable', 'string', 'max:64', 'regex:/^[a-z0-9-]+$/'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'is_active' => ['sometimes', 'boolean'],
            'seo_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'seo_description' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        if ($category && ($data['parent_id'] ?? null) && $category->children()->exists()) {
            throw new DomainException(__('admin.category_has_children'), 'category_has_children');
        }

        return $data;
    }

    /** @return array<string, mixed> */
    private function present(Category $c): array
    {
        return [
            'id' => $c->id,
            'parent_id' => $c->parent_id,
            'name' => $c->name,
            'slug' => $c->slug,
            'description' => $c->description,
            'icon' => $c->icon,
            'sort_order' => $c->sort_order,
            'is_active' => $c->is_active,
            'seo_title' => $c->seo_title,
            'seo_description' => $c->seo_description,
            'courses_count' => $c->courses_count ?? 0,
            'products_count' => $c->products_count ?? 0,
            'children_count' => $c->children_count ?? 0,
        ];
    }
}
