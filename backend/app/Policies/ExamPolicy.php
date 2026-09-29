<?php

namespace App\Policies;

use App\Models\Exam;
use App\Models\User;
use App\Services\Learning\LearningAccess;

class ExamPolicy
{
    public function __construct(private readonly LearningAccess $access) {}

    public function take(User $user, Exam $exam): bool
    {
        return $this->access->canTakeExam($user, $exam);
    }
}
