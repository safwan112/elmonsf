<?php

namespace App\Policies;

use App\Models\QuestionBank;
use App\Models\User;
use App\Services\Learning\LearningAccess;

class QuestionBankPolicy
{
    public function __construct(private readonly LearningAccess $access) {}

    public function practice(User $user, QuestionBank $bank): bool
    {
        return $this->access->canUseBank($user, $bank);
    }
}
