<?php

namespace App\Http\Controllers\Api\V1\Catalog;

use App\Http\Controllers\Controller;
use App\Http\Requests\Catalog\ListCoursesRequest;
use App\Http\Resources\Catalog\CourseListResource;
use App\Http\Resources\Catalog\CourseResource;
use App\Models\Category;
use App\Models\Course;
use App\Models\CoursePlan;
use App\Models\Lesson;
use App\Support\Money;
use App\Support\RichText;
use App\Support\VideoEmbed;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CourseController extends Controller
{
    public function index(ListCoursesRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();
        $search = trim((string) ($filters['search'] ?? ''));
        $sort = $filters['sort'] ?? ($search !== '' ? 'relevance' : 'newest');

        $minPrice = CoursePlan::query()
            ->selectRaw('min(price_amount)')
            ->whereColumn('course_plans.course_id', 'courses.id')
            ->where('is_active', true);

        $query = Course::query()
            ->published()
            ->select('courses.*')
            ->addSelect(['min_price_amount' => $minPrice])
            ->with(['category', 'instructor', 'cheapestPlan'])
            ->when($filters['category'] ?? null, function (Builder $q, string $slug) {
                // A parent category includes its sub-categories.
                $category = Category::query()->active()->where('slug', $slug)->with('children')->first();
                $ids = $category ? [$category->id, ...$category->children->pluck('id')] : [0];
                $q->whereIn('category_id', $ids);
            })
            ->when($filters['instructor'] ?? null, fn (Builder $q, string $slug) => $q->whereHas(
                'instructor',
                fn (Builder $i) => $i->where('slug', $slug),
            ))
            ->when($filters['level'] ?? null, fn (Builder $q, string $level) => $q->where('level', $level))
            ->when($request->boolean('featured'), fn (Builder $q) => $q->where('is_featured', true))
            ->when(isset($filters['min_price']) || isset($filters['max_price']), function (Builder $q) use ($filters) {
                $q->whereHas('plans', function (Builder $p) use ($filters) {
                    $p->where('is_active', true);
                    if (isset($filters['min_price'])) {
                        $p->where('price_amount', '>=', Money::toMinor($filters['min_price']));
                    }
                    if (isset($filters['max_price'])) {
                        $p->where('price_amount', '<=', Money::toMinor($filters['max_price']));
                    }
                });
            });

        if ($search !== '') {
            $query->search($search);
        }

        match ($sort) {
            'popular' => $query->orderByDesc('students_count'),
            'rating' => $query->orderByDesc('rating_avg')->orderByDesc('rating_count'),
            'price_asc' => $query->orderByRaw($this->nullsLast('min_price_amount', 'ASC', $query)),
            'price_desc' => $query->orderByRaw($this->nullsLast('min_price_amount', 'DESC', $query)),
            'relevance' => null, // search() already orders by similarity
            default => $query->orderByDesc('published_at'),
        };
        $query->orderByDesc('courses.id');

        return CourseListResource::collection(
            $query->paginate($request->integer('per_page', 12))->withQueryString()
        );
    }

    public function show(string $slug): JsonResponse
    {
        $course = Course::query()
            ->published()
            ->where('slug', $slug)
            ->with([
                'category.parent',
                'instructor' => fn ($q) => $q->withCount(['courses' => fn (Builder $c) => $c->published()]),
                'activePlans',
                'cheapestPlan',
                'tags',
                'sections.lessons' => fn ($q) => $q->where('is_published', true),
            ])
            ->firstOrFail();

        $related = Course::query()
            ->published()
            ->where('category_id', $course->category_id)
            ->whereKeyNot($course->id)
            ->with(['category', 'instructor', 'cheapestPlan'])
            ->orderByDesc('is_featured')
            ->orderByDesc('students_count')
            ->limit(3)
            ->get();

        return (new CourseResource($course))
            ->additional(['related' => CourseListResource::collection($related)])
            ->response();
    }

    /**
     * Free preview of a lesson marked as preview on a published course.
     */
    public function preview(string $slug, int $lessonId): JsonResponse
    {
        $course = Course::query()->published()->where('slug', $slug)->firstOrFail();

        /** @var Lesson $lesson */
        $lesson = $course->lessons()
            ->whereKey($lessonId)
            ->where('is_preview', true)
            ->where('is_published', true)
            ->firstOrFail();

        return response()->json([
            'data' => [
                'id' => $lesson->id,
                'title' => $lesson->title,
                'type' => ['value' => $lesson->type->value, 'label' => $lesson->type->label()],
                'duration_seconds' => $lesson->duration_seconds,
                'content_html' => RichText::toHtml($lesson->content),
                'video_embed_url' => VideoEmbed::url($lesson->video_provider, $lesson->video_ref),
            ],
        ]);
    }

    /**
     * Unpriced courses last. PostgreSQL has NULLS LAST (and rejects aliases
     * inside ORDER BY expressions); MySQL/MariaDB sort on "IS NULL" first.
     */
    private function nullsLast(string $alias, string $direction, Builder $query): string
    {
        return $query->getConnection()->getDriverName() === 'pgsql'
            ? "{$alias} {$direction} NULLS LAST"
            : "{$alias} IS NULL, {$alias} {$direction}";
    }
}
