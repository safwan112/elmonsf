<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\Admin\Concerns\AdminCrud;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    use AdminCrud;

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'action' => ['nullable', 'string', 'max:100', 'regex:/^[a-z_.]+$/'],
            'actor_id' => ['nullable', 'integer'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $page = AuditLog::query()
            ->with('actor:id,name,email')
            // "course" matches course.created, course.updated…
            ->when($filters['action'] ?? null, fn ($q, $a) => str_contains($a, '.') ? $q->where('action', $a) : $q->where('action', 'like', addcslashes($a, '%_\\').'.%'))
            ->when($filters['actor_id'] ?? null, fn ($q, $id) => $q->where('actor_id', $id))
            ->when($filters['from'] ?? null, fn ($q, $d) => $q->where('created_at', '>=', $d))
            ->when($filters['to'] ?? null, fn ($q, $d) => $q->where('created_at', '<', now()->parse($d)->addDay()))
            ->latest('id')
            ->paginate($this->perPage($request, 50))
            ->withQueryString();

        return $this->paginated($page, fn (AuditLog $log) => [
            'id' => $log->id,
            'action' => $log->action,
            'actor' => $log->actor ? ['id' => $log->actor->id, 'name' => $log->actor->name, 'email' => $log->actor->email] : null,
            'subject_type' => $log->subject_type ? class_basename($log->subject_type) : null,
            'subject_id' => $log->subject_id,
            'ip_address' => $log->ip_address,
            'user_agent' => $log->user_agent,
            'metadata' => $log->metadata,
            'created_at' => $log->created_at?->toIso8601String(),
        ]);
    }
}
