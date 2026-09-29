<?php

namespace App\Console\Commands;

use App\Services\Commerce\EnrollmentService;
use Illuminate\Console\Command;

class ExpireEnrollments extends Command
{
    protected $signature = 'enrollments:expire';

    protected $description = 'Mark enrollments whose access period has ended as expired';

    public function handle(EnrollmentService $enrollments): int
    {
        $count = $enrollments->expireDue();
        $this->info("Expired {$count} enrollment(s).");

        return self::SUCCESS;
    }
}
