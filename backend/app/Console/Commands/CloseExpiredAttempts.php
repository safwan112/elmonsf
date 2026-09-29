<?php

namespace App\Console\Commands;

use App\Services\Learning\ExamService;
use Illuminate\Console\Command;

class CloseExpiredAttempts extends Command
{
    protected $signature = 'exams:close-expired';

    protected $description = 'Grade and close exam attempts whose time ran out';

    public function handle(ExamService $exams): int
    {
        $count = $exams->closeExpired();
        $this->info("Closed {$count} expired attempt(s).");

        return self::SUCCESS;
    }
}
