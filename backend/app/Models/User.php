<?php

namespace App\Models;

use App\Enums\RoleName;
use App\Enums\UserStatus;
use App\Notifications\ResetPasswordNotification;
use App\Notifications\VerifyEmailNotification;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Contracts\Translation\HasLocalePreference;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements HasLocalePreference, MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * Mass-assignable attributes. Status and roles are deliberately excluded:
     * they can only be changed through explicit, authorized admin actions.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'locale',
        'marketing_emails',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'status' => UserStatus::class,
            'marketing_emails' => 'boolean',
        ];
    }

    public function preferredLocale(): string
    {
        return $this->locale ?: config('app.locale');
    }

    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new VerifyEmailNotification);
    }

    /**
     * @param  string  $token
     */
    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    public function cart(): HasOne
    {
        return $this->hasOne(Cart::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function productEntitlements(): HasMany
    {
        return $this->hasMany(ProductEntitlement::class);
    }

    public function instructorProfile(): HasOne
    {
        return $this->hasOne(Instructor::class);
    }

    public function lessonProgress(): HasMany
    {
        return $this->hasMany(LessonProgress::class);
    }

    public function examAttempts(): HasMany
    {
        return $this->hasMany(ExamAttempt::class);
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class)->withPivot('created_at');
    }

    public function hasRole(RoleName|string ...$roles): bool
    {
        $wanted = array_map(fn ($r) => $r instanceof RoleName ? $r : RoleName::from($r), $roles);

        return $this->roles->contains(fn (Role $role) => in_array($role->name, $wanted, true));
    }

    public function isAdmin(): bool
    {
        return $this->hasRole(RoleName::Admin);
    }

    public function isActive(): bool
    {
        return $this->status === UserStatus::Active;
    }

    public function assignRole(RoleName|string ...$roles): static
    {
        $ids = collect($roles)->map(fn ($r) => Role::findByName($r)->id)->all();
        $this->roles()->syncWithoutDetaching($ids);
        $this->unsetRelation('roles');

        return $this;
    }

    public function removeRole(RoleName|string $role): static
    {
        $this->roles()->detach(Role::findByName($role)->id);
        $this->unsetRelation('roles');

        return $this;
    }

    /**
     * @return list<string>
     */
    public function roleNames(): array
    {
        return $this->roles->map(fn (Role $role) => $role->name->value)->values()->all();
    }

    public function avatarUrl(): ?string
    {
        return $this->avatar_path ? Storage::disk('public')->url($this->avatar_path) : null;
    }

    public function scopeWithRole(Builder $query, RoleName|string $role): Builder
    {
        $value = $role instanceof RoleName ? $role->value : $role;

        return $query->whereHas('roles', fn (Builder $q) => $q->where('name', $value));
    }

    public function scopeSearch(Builder $query, ?string $term): Builder
    {
        $term = trim((string) $term);
        if ($term === '') {
            return $query;
        }

        $like = '%'.addcslashes($term, '%_\\').'%';

        return $query->where(fn (Builder $q) => $q
            ->whereLike('name', $like)
            ->orWhereLike('email', $like)
            ->orWhereLike('phone', $like));
    }
}
