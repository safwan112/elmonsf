<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListUsersRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class UserController extends Controller
{
    public function index(ListUsersRequest $request): AnonymousResourceCollection
    {
        $sort = $request->validated('sort') ?? '-created_at';
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $column = ltrim($sort, '-');

        $users = User::query()
            ->with('roles')
            ->search($request->validated('search'))
            ->when($request->validated('role'), fn ($q, $role) => $q->withRole($role))
            ->when($request->validated('status'), fn ($q, $status) => $q->where('status', $status))
            ->orderBy($column, $direction)
            ->orderBy('id', $direction)
            ->paginate($request->integer('per_page', config('platform.pagination.default')))
            ->withQueryString();

        return UserResource::collection($users);
    }

    public function show(User $user): UserResource
    {
        Gate::authorize('view', $user);

        return new UserResource($user->load('roles'));
    }
}
