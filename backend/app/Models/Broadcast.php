<?php

namespace App\Models;

use App\Enums\EnrollmentStatus;
use App\Enums\RoleName;
use App\Enums\UserStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Broadcast extends Model
{
    public const AUDIENCES = ['all', 'students', 'instructors', 'course'];

    protected $fillable = ['sent_by', 'title', 'body', 'url', 'audience', 'course_id', 'send_email', 'status', 'recipients_count', 'sent_at'];

    protected function casts(): array
    {
        return [
            'send_email' => 'boolean',
            'recipients_count' => 'integer',
            'sent_at' => 'datetime',
        ];
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by');
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /** Active users this broadcast goes to. */
    public function recipients(): Builder
    {
        $query = User::query()->where('status', UserStatus::Active);

        return match ($this->audience) {
            'students' => $query->withRole(RoleName::Student),
            'instructors' => $query->withRole(RoleName::Instructor),
            'course' => $query->whereHas('enrollments', fn (Builder $e) => $e
                ->where('course_id', $this->course_id)
                ->where('status', EnrollmentStatus::Active)
                ->where(fn (Builder $q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))),
            default => $query,
        };
    }

    public function audienceLabel(): string
    {
        return match ($this->audience) {
            'students' => 'كل الطلاب',
            'instructors' => 'كل المدرّبين',
            'course' => 'المشتركون في دورة',
            default => 'كل المستخدمين',
        };
    }
}
