<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\RoleName;
use App\Http\Controllers\Api\V1\Admin\Concerns\AdminCrud;
use App\Http\Controllers\Controller;
use App\Models\Instructor;
use App\Models\User;
use App\Support\UniqueSlug;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InstructorController extends Controller
{
    use AdminCrud;

    public function index(): JsonResponse
    {
        $instructors = Instructor::query()->withCount('courses')->with('user:id,name,email')->orderBy('sort_order')->orderBy('id')->get();

        return response()->json(['data' => $instructors->map(fn (Instructor $i) => $this->present($i))->values()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->applyMedia($this->validated($request), 'avatar_media_id', 'avatar_path');
        $data['slug'] = UniqueSlug::for(Instructor::class, $data['slug'] ?? $data['name']);

        $instructor = Instructor::query()->create($data)->refresh();
        $this->linkRole($instructor);
        $this->audit('instructor.created', $instructor);

        return response()->json(['data' => $this->present($instructor->loadCount('courses')->load('user:id,name,email'))], 201);
    }

    public function update(Request $request, Instructor $instructor): JsonResponse
    {
        $data = $this->applyMedia($this->validated($request, $instructor), 'avatar_media_id', 'avatar_path');
        if (array_key_exists('slug', $data)) {
            $data['slug'] = UniqueSlug::for(Instructor::class, $data['slug'] ?: ($data['name'] ?? $instructor->name), $instructor->id);
        }

        $instructor->update($data);
        $this->linkRole($instructor);
        $this->audit('instructor.updated', $instructor, ['fields' => array_keys($data)]);

        return response()->json(['data' => $this->present($instructor->loadCount('courses')->load('user:id,name,email'))]);
    }

    public function destroy(Instructor $instructor): JsonResponse
    {
        // Courses keep existing without an instructor (nullOnDelete).
        $instructor->delete();
        $this->audit('instructor.deleted', $instructor, ['name' => $instructor->name]);

        return response()->json(['message' => __('admin.deleted')]);
    }

    /** A linked account gets the instructor role so it can manage its courses. */
    private function linkRole(Instructor $instructor): void
    {
        if ($instructor->user_id) {
            User::query()->find($instructor->user_id)?->assignRole(RoleName::Instructor);
        }
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?Instructor $instructor = null): array
    {
        return $request->validate([
            'name' => [$instructor ? 'sometimes' : 'required', 'string', 'max:120'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:120'],
            'headline' => ['sometimes', 'nullable', 'string', 'max:255'],
            'bio' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id', Rule::unique('instructors', 'user_id')->ignore($instructor?->id)],
            'avatar_media_id' => ['sometimes', 'nullable', 'integer', 'exists:media_assets,id'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:100000'],
        ]);
    }

    /** @return array<string, mixed> */
    private function present(Instructor $i): array
    {
        return [
            'id' => $i->id,
            'name' => $i->name,
            'slug' => $i->slug,
            'headline' => $i->headline,
            'bio' => $i->bio,
            'avatar_url' => $i->avatarUrl(),
            'is_active' => $i->is_active,
            'sort_order' => $i->sort_order,
            'courses_count' => $i->courses_count ?? 0,
            'user' => $i->user ? ['id' => $i->user->id, 'name' => $i->user->name, 'email' => $i->user->email] : null,
        ];
    }
}
