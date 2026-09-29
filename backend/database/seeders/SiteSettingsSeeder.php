<?php

namespace Database\Seeders;

use App\Models\SiteSetting;
use Illuminate\Database\Seeder;

/**
 * Default public settings. Existing values are never overwritten, so this
 * is safe to re-run in any environment.
 */
class SiteSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            'site_name' => config('app.name'),
            'tagline' => 'منصة التدريب على اختبارات القدرات والتحصيلي',
            'contact_email' => 'support@example.com',
            'contact_phone' => null,
            'whatsapp' => null,
            'working_hours' => 'من الأحد إلى الخميس، 9 صباحاً – 9 مساءً',
            'social' => [
                'x' => null,
                'instagram' => null,
                'tiktok' => null,
                'youtube' => null,
                'telegram' => null,
            ],
        ];

        foreach ($defaults as $key => $value) {
            SiteSetting::query()->firstOrCreate(['key' => $key], ['value' => $value, 'is_public' => true]);
        }
    }
}
