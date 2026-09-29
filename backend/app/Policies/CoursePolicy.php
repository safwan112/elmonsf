<?php

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\Course;
use App\Models\User;

/**
 * Course management in the admin area. Admins manage everything;
 * instructors manage only the courses they teach and cannot delete them.
 */
class CoursePolicy
{
    public function manageAny(User $user): bool
    {
        return $user->hasRole(RoleName::Admin, RoleName::Instructor);
    }

    public function create(User $user): bool
    {
        return $user->isAdmin() || ($user->hasRole(RoleName::Instructor) && $user->instructorProfile()->exists());
    }

    public function manage(User $user, Course $course): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->hasRole(RoleName::Instructor)
            && $course->instructor_id !== null
            && $course->instructor_id === $user->instructorProfile()->value('id');
    }

    public function delete(User $user, Course $course): bool
    {
        return $user->isAdmin();
    }
}
