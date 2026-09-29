<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\RoleName;
use App\Enums\UserStatus;
use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListUsersRequest;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\SessionManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

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

    /**
     * Change a user's status and/or roles. Never on one's own account, so
     * an admin cannot lock themselves (or the platform) out by mistake.
     */
    public function update(Request $request, User $user, SessionManager $sessions, AuditLogger $audit): JsonResponse
    {
        if ($request->user()->is($user)) {
            throw new DomainException(__('admin.cannot_modify_self'), 'cannot_modify_self', 403);
        }
        Gate::authorize('manage', $user);

        $data = $request->validate([
            'status' => ['sometimes', Rule::enum(UserStatus::class)],
            'roles' => ['sometimes', 'array', 'min:1'],
            'roles.*' => ['string', 'distinct', Rule::enum(RoleName::class)],
        ]);

        $before = ['status' => $user->status->value, 'roles' => $user->load('roles')->roleNames()];

        DB::transaction(function () use ($user, $data) {
            if (isset($data['status'])) {
                $user->forceFill(['status' => $data['status']])->save();
            }
            if (isset($data['roles'])) {
                $user->roles()->sync(collect($data['roles'])->map(fn ($r) => Role::findByName($r)->id)->all());
                $user->unsetRelation('roles');
            }
        });

        // A suspended user is signed out everywhere immediately.
        if (($data['status'] ?? null) === UserStatus::Suspended->value) {
            $sessions->logoutAllSessions($user);
        }

        $audit->log('admin.user_updated', $user, [
            'before' => $before,
            'after' => ['status' => $user->status->value, 'roles' => $user->load('roles')->roleNames()],
        ]);

        return (new UserResource($user))->additional(['message' => __('admin.user_updated')])->response();
    }
}
