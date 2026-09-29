<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            UserSeeder::class,
            SiteSettingsSeeder::class,
        ]);

        // Demo catalog and CMS content are for development and demos only.
        if (! app()->isProduction()) {
            $this->call([
                DemoCatalogSeeder::class,
                DemoContentSeeder::class,
                DemoLearningSeeder::class,
            ]);
        }
    }
}
