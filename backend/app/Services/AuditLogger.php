<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Throwable;

class AuditLogger
{
    public function __construct(private readonly Request $request) {}

    /**
     * Record an action. Failures are reported but never break the request:
     * auditing must not take the platform down.
     *
     * @param  array<string, mixed>  $metadata
     */
    public function log(string $action, ?Model $subject = null, array $metadata = [], ?User $actor = null): ?AuditLog
    {
        try {
            $actor ??= $this->request->user();

            return AuditLog::query()->create([
                'actor_id' => $actor?->getKey(),
                'action' => $action,
                'subject_type' => $subject?->getMorphClass(),
                'subject_id' => $subject?->getKey(),
                'ip_address' => $this->request->ip(),
                'user_agent' => Str::limit((string) $this->request->userAgent(), 500, ''),
                'metadata' => $metadata ?: null,
            ]);
        } catch (Throwable $e) {
            report($e);

            return null;
        }
    }
}
