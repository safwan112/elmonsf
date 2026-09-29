<?php

namespace App\Policies;

use App\Models\ExamAttempt;
use App\Models\User;

class ExamAttemptPolicy
{
    /** Attempts are private to the student who took them (and admins). */
    public function view(User $user, ExamAttempt $attempt): bool
    {
        return $attempt->user_id === $user->id || $user->isAdmin();
    }

    /** Only the student themselves can answer or submit. */
    public function update(User $user, ExamAttempt $attempt): bool
    {
        return $attempt->user_id === $user->id;
    }
}
