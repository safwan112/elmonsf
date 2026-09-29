<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $actor): bool
    {
        return $actor->isAdmin();
    }

    public function view(User $actor, User $target): bool
    {
        return $actor->isAdmin() || $actor->is($target);
    }

    public function update(User $actor, User $target): bool
    {
        return $actor->isAdmin() || $actor->is($target);
    }

    /**
     * Role/status changes: admins only, and never on their own account
     * (prevents locking the platform out of its last admin by mistake).
     */
    public function manage(User $actor, User $target): bool
    {
        return $actor->isAdmin() && ! $actor->is($target);
    }
}
