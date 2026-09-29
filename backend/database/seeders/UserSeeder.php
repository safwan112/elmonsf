<?php

namespace Database\Seeders;

use App\Enums\RoleName;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Seeds the admin account plus demo instructor/student accounts.
 *
 * Passwords come from SEED_ADMIN_PASSWORD / SEED_DEMO_PASSWORD. Local and
 * testing environments fall back to documented development passwords; any
 * other environment must provide explicit values.
 */
class UserSeeder extends Seeder
{
    private const DEV_ADMIN_PASSWORD = 'Admin@12345';

    private const DEV_DEMO_PASSWORD = 'Demo@12345';

    public function run(): void
    {
        $adminPassword = $this->password('admin_password', 'SEED_ADMIN_PASSWORD', self::DEV_ADMIN_PASSWORD);
        $demoPassword = $this->password('demo_password', 'SEED_DEMO_PASSWORD', self::DEV_DEMO_PASSWORD);

        $this->upsertUser(
            email: (string) config('platform.seed.admin_email'),
            name: (string) config('platform.seed.admin_name'),
            password: $adminPassword,
            role: RoleName::Admin,
        );

        if (app()->isProduction()) {
            return;
        }

        $this->upsertUser('instructor@example.com', 'أ. سارة المدرّبة', $demoPassword, RoleName::Instructor);
        $this->upsertUser('student@example.com', 'طالب تجريبي', $demoPassword, RoleName::Student);
    }

    private function password(string $configKey, string $envName, string $devDefault): string
    {
        $value = (string) config("platform.seed.{$configKey}", '');
        if ($value !== '') {
            return $value;
        }

        if (app()->environment(['local', 'testing'])) {
            return $devDefault;
        }

        throw new RuntimeException("{$envName} must be set to seed accounts outside local/testing environments.");
    }

    private function upsertUser(string $email, string $name, string $password, RoleName $role): void
    {
        $user = User::withTrashed()->firstOrNew(['email' => $email]);

        if (! $user->exists) {
            $user->fill(['name' => $name, 'password' => $password, 'locale' => 'ar']);
            $user->forceFill([
                'status' => UserStatus::Active,
                'email_verified_at' => now(),
            ])->save();
        }

        $user->assignRole($role);
        if ($role !== RoleName::Student) {
            // Staff accounts can also browse and purchase as students.
            $user->assignRole(RoleName::Student);
        }
    }
}
