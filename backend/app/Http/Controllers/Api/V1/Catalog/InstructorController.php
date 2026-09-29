<?php

namespace App\Http\Controllers\Api\V1\Catalog;

use App\Http\Controllers\Controller;
use App\Http\Resources\Catalog\CourseListResource;
use App\Http\Resources\Catalog\InstructorResource;
use App\Models\Instructor;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class InstructorController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return InstructorResource::collection(
            Instructor::query()
                ->active()
                ->withCount(['courses' => fn (Builder $q) => $q->published()])
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
        );
    }

    public function show(string $slug): JsonResponse
    {
        $instructor = Instructor::query()
            ->active()
            ->where('slug', $slug)
            ->withCount(['courses' => fn (Builder $q) => $q->published()])
            ->firstOrFail();

        $courses = $instructor->courses()
            ->published()
            ->with(['category', 'instructor', 'cheapestPlan'])
            ->orderByDesc('published_at')
            ->get();

        return (new InstructorResource($instructor))
            ->detailed()
            ->additional(['courses' => CourseListResource::collection($courses)])
            ->response();
    }
}
