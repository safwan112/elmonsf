<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\CourseLevel;
use App\Enums\PublishStatus;
use App\Exceptions\DomainException;
use App\Http\Controllers\Api\V1\Admin\Concerns\AdminCrud;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminCourseResource;
use App\Models\Course;
use App\Models\Tag;
use App\Models\User;
use App\Support\Slug;
use App\Support\UniqueSlug;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * Course management. Admins see every course; instructors only theirs
 * (CoursePolicy), and new courses they create are assigned to them.
 */
class CourseController extends Controller
{
    use AdminCrud;

    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('manageAny', Course::class);
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::enum(PublishStatus::class)],
            'category_id' => ['nullable', 'integer'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $user = $request->user();

        $courses = Course::query()
            ->with(['category', 'instructor'])
            ->when(! $user->isAdmin(), fn ($q) => $q->where('instructor_id', $user->instructorProfile()->value('id') ?? 0))
            ->when($filters['search'] ?? null, fn ($q, $s) => $q->whereLike('title', $this->like($s)))
            ->when($filters['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->when($filters['category_id'] ?? null, fn ($q, $c) => $q->where('category_id', $c))
            ->latest('updated_at')
            ->orderByDesc('id')
            ->paginate($this->perPage($request))
            ->withQueryString();

        return AdminCourseResource::collection($courses);
    }

    public function show(Course $course): AdminCourseResource
    {
        Gate::authorize('manage', $course);

        return $this->full($course);
    }

    public function store(Request $request): JsonResponse
    {
        Gate::authorize('create', Course::class);
        $user = $request->user();
        $data = $this->applyMedia($this->validated($request), 'cover_media_id', 'cover_path');

        if (! $user->isAdmin()) {
            $data['instructor_id'] = $user->instructorProfile()->value('id');
        }
        $data['slug'] = UniqueSlug::for(Course::class, $data['slug'] ?? $data['title']);
        $data['status'] ??= PublishStatus::Draft->value;
        $data = $this->publishDate($data);

        $course = DB::transaction(function () use ($data) {
            $tags = $data['tags'] ?? null;
            unset($data['tags']);
            // Refresh to pick up database defaults (level, language…).
            $course = Course::query()->create($data)->refresh();
            $this->syncTags($course, $tags);

            return $course;
        });
        $this->audit('course.created', $course);

        return $this->full($course)->response()->setStatusCode(201);
    }

    public function update(Request $request, Course $course): AdminCourseResource
    {
        Gate::authorize('manage', $course);
        $user = $request->user();
        $data = $this->applyMedia($this->validated($request, $course), 'cover_media_id', 'cover_path');

        if (! $user->isAdmin()) {
            unset($data['instructor_id']);
        }
        if (array_key_exists('slug', $data)) {
            $data['slug'] = UniqueSlug::for(Course::class, $data['slug'] ?: ($data['title'] ?? $course->title), $course->id);
        }
        $data = $this->publishDate($data, $course);

        DB::transaction(function () use ($course, $data) {
            $tags = $data['tags'] ?? null;
            unset($data['tags']);
            $course->update($data);
            $this->syncTags($course, $tags);
        });
        $this->audit('course.updated', $course, ['fields' => array_keys($data)]);

        return $this->full($course);
    }

    public function destroy(Course $course): JsonResponse
    {
        Gate::authorize('delete', $course);

        // Soft delete: orders, enrollments and progress keep their history.
        $course->delete();
        $this->audit('course.deleted', $course, ['title' => $course->title]);

        return response()->json(['message' => __('admin.deleted')]);
    }

    private function full(Course $course): AdminCourseResource
    {
        $course->load([
            'category', 'instructor', 'tags',
            'plans' => fn ($q) => $q->orderBy('sort_order')->orderBy('id'),
            'sections.lessons.attachments',
        ]);

        return (new AdminCourseResource($course))->detailed();
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?Course $course = null): array
    {
        $partial = $course !== null;

        return $request->validate([
            'title' => [$partial ? 'sometimes' : 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:120'],
            'subtitle' => ['sometimes', 'nullable', 'string', 'max:500'],
            'description' => ['sometimes', 'nullable', 'string', 'max:50000'],
            'category_id' => [$partial ? 'sometimes' : 'required', 'integer', 'exists:categories,id'],
            'instructor_id' => ['sometimes', 'nullable', 'integer', 'exists:instructors,id'],
            'level' => ['sometimes', Rule::enum(CourseLevel::class)],
            'language' => ['sometimes', Rule::in(['ar', 'en'])],
            'status' => ['sometimes', Rule::enum(PublishStatus::class)],
            'published_at' => ['sometimes', 'nullable', 'date'],
            'is_featured' => ['sometimes', 'boolean'],
            'outcomes' => ['sometimes', 'array', 'max:20'],
            'outcomes.*' => ['string', 'max:255'],
            'requirements' => ['sometimes', 'array', 'max:20'],
            'requirements.*' => ['string', 'max:255'],
            'tags' => ['sometimes', 'array', 'max:15'],
            'tags.*' => ['string', 'max:40'],
            'cover_media_id' => ['sometimes', 'nullable', 'integer', 'exists:media_assets,id'],
            'seo_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'seo_description' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);
    }

    /**
     * Publishing without a date publishes now.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function publishDate(array $data, ?Course $course = null): array
    {
        $status = $data['status'] ?? $course?->status->value;
        if ($status === PublishStatus::Published->value && empty($data['published_at']) && ! $course?->published_at) {
            $data['published_at'] = now();
        }

        return $data;
    }

    /** @param list<string>|null $names */
    private function syncTags(Course $course, ?array $names): void
    {
        if ($names === null) {
            return;
        }

        $ids = collect($names)
            ->map(fn ($n) => trim($n))
            ->filter()
            ->unique()
            ->map(fn ($name) => Tag::query()->firstOrCreate(['slug' => Slug::make($name)], ['name' => $name])->id);
        $course->tags()->sync($ids);
    }

    /** Ensure a nested resource belongs to a course the user manages. */
    public static function authorizeCourse(User $user, ?Course $course): void
    {
        if (! $course || ! Gate::forUser($user)->allows('manage', $course)) {
            throw new DomainException(__('admin.instructor_course_only'), 'forbidden', 403);
        }
    }
}
