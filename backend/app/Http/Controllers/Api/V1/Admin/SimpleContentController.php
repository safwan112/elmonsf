<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\PublishStatus;
use App\Http\Controllers\Api\V1\Admin\Concerns\AdminCrud;
use App\Http\Controllers\Controller;
use App\Models\Faq;
use App\Models\Page;
use App\Models\Testimonial;
use App\Support\UniqueSlug;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * CMS pages, FAQs and testimonials: small lists edited in place.
 */
class SimpleContentController extends Controller
{
    use AdminCrud;

    // ---- Pages -----------------------------------------------------------

    public function pages(): JsonResponse
    {
        return response()->json(['data' => Page::query()->orderBy('title')->get()->map(fn (Page $p) => $this->page($p))->values()]);
    }

    public function storePage(Request $request): JsonResponse
    {
        $data = $this->pageData($request);
        $data['slug'] = UniqueSlug::for(Page::class, $data['slug'] ?? $data['title']);
        $page = Page::query()->create($data)->refresh();
        $this->audit('page.created', $page);

        return response()->json(['data' => $this->page($page)], 201);
    }

    public function updatePage(Request $request, Page $page): JsonResponse
    {
        $data = $this->pageData($request, true);
        if (array_key_exists('slug', $data)) {
            $data['slug'] = UniqueSlug::for(Page::class, $data['slug'] ?: ($data['title'] ?? $page->title), $page->id);
        }
        $page->update($data);
        $this->audit('page.updated', $page, ['fields' => array_keys($data)]);

        return response()->json(['data' => $this->page($page)]);
    }

    public function destroyPage(Page $page): JsonResponse
    {
        $page->delete();
        $this->audit('page.deleted', $page, ['title' => $page->title]);

        return response()->json(['message' => __('admin.deleted')]);
    }

    // ---- FAQs --------------------------------------------------------------

    public function faqs(): JsonResponse
    {
        return response()->json(['data' => Faq::query()->orderBy('group')->orderBy('sort_order')->orderBy('id')->get()->map(fn (Faq $f) => $this->faq($f))->values()]);
    }

    public function storeFaq(Request $request): JsonResponse
    {
        $faq = Faq::query()->create($this->faqData($request))->refresh();
        $this->audit('faq.created', $faq);

        return response()->json(['data' => $this->faq($faq)], 201);
    }

    public function updateFaq(Request $request, Faq $faq): JsonResponse
    {
        $faq->update($this->faqData($request, true));
        $this->audit('faq.updated', $faq);

        return response()->json(['data' => $this->faq($faq)]);
    }

    public function destroyFaq(Faq $faq): JsonResponse
    {
        $faq->delete();
        $this->audit('faq.deleted', $faq);

        return response()->json(['message' => __('admin.deleted')]);
    }

    // ---- Testimonials -------------------------------------------------------

    public function testimonials(): JsonResponse
    {
        return response()->json(['data' => Testimonial::query()->orderBy('sort_order')->orderBy('id')->get()->map(fn (Testimonial $t) => $this->testimonial($t))->values()]);
    }

    public function storeTestimonial(Request $request): JsonResponse
    {
        $testimonial = Testimonial::query()->create($this->applyMedia($this->testimonialData($request), 'avatar_media_id', 'avatar_path'))->refresh();
        $this->audit('testimonial.created', $testimonial);

        return response()->json(['data' => $this->testimonial($testimonial)], 201);
    }

    public function updateTestimonial(Request $request, Testimonial $testimonial): JsonResponse
    {
        $testimonial->update($this->applyMedia($this->testimonialData($request, true), 'avatar_media_id', 'avatar_path'));
        $this->audit('testimonial.updated', $testimonial);

        return response()->json(['data' => $this->testimonial($testimonial)]);
    }

    public function destroyTestimonial(Testimonial $testimonial): JsonResponse
    {
        $testimonial->delete();
        $this->audit('testimonial.deleted', $testimonial);

        return response()->json(['message' => __('admin.deleted')]);
    }

    // ---- Validation & presentation ------------------------------------------

    /** @return array<string, mixed> */
    private function pageData(Request $request, bool $partial = false): array
    {
        return $request->validate([
            'title' => [$partial ? 'sometimes' : 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:120'],
            'body' => [$partial ? 'sometimes' : 'required', 'string', 'max:100000'],
            'status' => ['sometimes', Rule::enum(PublishStatus::class)],
            'seo_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'seo_description' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);
    }

    /** @return array<string, mixed> */
    private function faqData(Request $request, bool $partial = false): array
    {
        $data = $request->validate([
            'group' => ['sometimes', 'nullable', 'string', 'max:64', 'regex:/^[a-z0-9_-]+$/'],
            'question' => [$partial ? 'sometimes' : 'required', 'string', 'max:500'],
            'answer' => [$partial ? 'sometimes' : 'required', 'string', 'max:10000'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        if (array_key_exists('group', $data) && ! $data['group']) {
            $data['group'] = 'general';
        }

        return $data;
    }

    /** @return array<string, mixed> */
    private function testimonialData(Request $request, bool $partial = false): array
    {
        return $request->validate([
            'name' => [$partial ? 'sometimes' : 'required', 'string', 'max:120'],
            'subtitle' => ['sometimes', 'nullable', 'string', 'max:255'],
            'body' => [$partial ? 'sometimes' : 'required', 'string', 'max:2000'],
            'rating' => ['sometimes', 'integer', 'between:1,5'],
            'avatar_media_id' => ['sometimes', 'nullable', 'integer', 'exists:media_assets,id'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }

    /** @return array<string, mixed> */
    private function page(Page $p): array
    {
        return [
            'id' => $p->id,
            'title' => $p->title,
            'slug' => $p->slug,
            'body' => $p->body,
            'status' => ['value' => $p->status->value, 'label' => $p->status->label()],
            'seo_title' => $p->seo_title,
            'seo_description' => $p->seo_description,
            'updated_at' => $p->updated_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    private function faq(Faq $f): array
    {
        return ['id' => $f->id, 'group' => $f->group, 'question' => $f->question, 'answer' => $f->answer, 'sort_order' => $f->sort_order, 'is_active' => $f->is_active];
    }

    /** @return array<string, mixed> */
    private function testimonial(Testimonial $t): array
    {
        return [
            'id' => $t->id, 'name' => $t->name, 'subtitle' => $t->subtitle, 'body' => $t->body, 'rating' => $t->rating,
            'avatar_url' => $t->avatarUrl(), 'sort_order' => $t->sort_order, 'is_active' => $t->is_active,
        ];
    }
}
