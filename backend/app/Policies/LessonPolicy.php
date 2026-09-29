<?php

namespace App\Policies;

use App\Models\Lesson;
use App\Models\User;
use App\Services\Learning\LearningAccess;

class LessonPolicy
{
    public function __construct(private readonly LearningAccess $access) {}

    public function view(User $user, Lesson $lesson): bool
    {
        return $this->access->canViewLesson($user, $lesson);
    }
}
