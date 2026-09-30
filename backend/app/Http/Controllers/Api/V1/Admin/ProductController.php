<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\ProductType;
use App\Enums\PublishStatus;
use App\Http\Controllers\Api\V1\Admin\Concerns\AdminCrud;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Support\Money;
use App\Support\UniqueSlug;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    use AdminCrud;

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::enum(PublishStatus::class)],
            'type' => ['nullable', Rule::enum(ProductType::class)],
        ]);

        $page = Product::query()
            ->with('category:id,name')
            ->when($filters['search'] ?? null, fn ($q, $s) => $q->whereLike('title', $this->like($s)))
            ->when($filters['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->when($filters['type'] ?? null, fn ($q, $t) => $q->where('type', $t))
            ->latest('updated_at')->orderByDesc('id')
            ->paginate($this->perPage($request))
            ->withQueryString();

        return $this->paginated($page, fn (Product $p) => $this->present($p));
    }

    public function show(Product $product): JsonResponse
    {
        return response()->json(['data' => $this->present($product->load('category:id,name'))]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->prepare($this->validated($request));
        $data['slug'] = UniqueSlug::for(Product::class, $data['slug'] ?? $data['title']);
        $data['currency'] = config('platform.commerce.currency', 'SAR');

        $product = Product::query()->create($data)->refresh();
        $this->audit('product.created', $product);

        return response()->json(['data' => $this->present($product->load('category:id,name'))], 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $data = $this->prepare($this->validated($request, $product), $product);
        if (array_key_exists('slug', $data)) {
            $data['slug'] = UniqueSlug::for(Product::class, $data['slug'] ?: ($data['title'] ?? $product->title), $product->id);
        }

        $product->update($data);
        $this->audit('product.updated', $product, ['fields' => array_keys($data)]);

        return response()->json(['data' => $this->present($product->load('category:id,name'))]);
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->delete(); // soft delete keeps orders and entitlements intact
        $this->audit('product.deleted', $product, ['title' => $product->title]);

        return response()->json(['message' => __('admin.deleted')]);
    }

    /** Downloadable file for the product (private disk). */
    public function uploadFile(Request $request, Product $product): JsonResponse
    {
        $request->validate(['file' => ['required', 'file', 'max:102400', 'mimes:pdf,zip,epub']]);
        $file = $request->file('file');

        $path = $file->storeAs('products', Str::random(40).'.'.strtolower($file->getClientOriginalExtension() ?: 'pdf'), 'local');
        if ($product->file_path) {
            Storage::disk($product->file_disk)->delete($product->file_path);
        }
        $product->forceFill(['file_disk' => 'local', 'file_path' => $path])->save();
        $this->audit('product.file_uploaded', $product);

        return response()->json(['data' => $this->present($product->load('category:id,name'))]);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?Product $product = null): array
    {
        $partial = $product !== null;

        return $request->validate([
            'title' => [$partial ? 'sometimes' : 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:120'],
            'type' => [$partial ? 'sometimes' : 'required', Rule::enum(ProductType::class)],
            'category_id' => ['sometimes', 'nullable', 'integer', 'exists:categories,id'],
            'subtitle' => ['sometimes', 'nullable', 'string', 'max:500'],
            'description' => ['sometimes', 'nullable', 'string', 'max:50000'],
            'price' => [$partial ? 'sometimes' : 'required', 'numeric', 'min:0', 'max:100000'],
            'compare_at_price' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:100000'],
            'status' => ['sometimes', Rule::enum(PublishStatus::class)],
            'published_at' => ['sometimes', 'nullable', 'date'],
            'is_featured' => ['sometimes', 'boolean'],
            'cover_media_id' => ['sometimes', 'nullable', 'integer', 'exists:media_assets,id'],
            'seo_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'seo_description' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function prepare(array $data, ?Product $product = null): array
    {
        $data = $this->applyMedia($data, 'cover_media_id', 'cover_path');
        $data = $this->applyMoney($data, ['price' => 'price_amount', 'compare_at_price' => 'compare_at_amount']);

        $status = $data['status'] ?? $product?->status->value;
        if ($status === PublishStatus::Published->value && empty($data['published_at']) && ! $product?->published_at) {
            $data['published_at'] = now();
        }

        return $data;
    }

    /** @return array<string, mixed> */
    private function present(Product $p): array
    {
        return [
            'id' => $p->id,
            'title' => $p->title,
            'slug' => $p->slug,
            'type' => ['value' => $p->type->value, 'label' => $p->type->label()],
            'category_id' => $p->category_id,
            'category' => $p->category ? ['id' => $p->category->id, 'name' => $p->category->name] : null,
            'subtitle' => $p->subtitle,
            'description' => $p->description,
            'price' => Money::toMajor($p->price_amount),
            'compare_at_price' => Money::toMajor($p->compare_at_amount),
            'currency' => $p->currency,
            'status' => ['value' => $p->status->value, 'label' => $p->status->label()],
            'published_at' => $p->published_at?->toIso8601String(),
            'is_featured' => $p->is_featured,
            'cover_url' => $p->coverUrl(),
            'has_file' => $p->file_path !== null,
            'seo_title' => $p->seo_title,
            'seo_description' => $p->seo_description,
            'updated_at' => $p->updated_at?->toIso8601String(),
        ];
    }
}
