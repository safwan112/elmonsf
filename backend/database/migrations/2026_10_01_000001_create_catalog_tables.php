<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Trigram similarity powers Arabic-friendly fuzzy search.
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('icon', 64)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->string('seo_title')->nullable();
            $table->string('seo_description', 500)->nullable();
            $table->timestamps();

            $table->index(['is_active', 'sort_order']);
        });

        Schema::create('instructors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->unique()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('headline')->nullable();
            $table->text('bio')->nullable();
            $table->string('avatar_path')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->foreignId('instructor_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('subtitle', 500)->nullable();
            $table->text('description')->nullable();
            $table->string('cover_path')->nullable();
            $table->string('level', 20)->default('all_levels');
            $table->string('language', 5)->default('ar');
            $table->string('status', 20)->default('draft');
            $table->boolean('is_featured')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->jsonb('outcomes')->nullable();
            $table->jsonb('requirements')->nullable();
            // Denormalised counters, refreshed when the curriculum changes.
            $table->unsignedInteger('lessons_count')->default(0);
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->unsignedInteger('students_count')->default(0);
            $table->decimal('rating_avg', 3, 2)->default(0);
            $table->unsignedInteger('rating_count')->default(0);
            $table->string('seo_title')->nullable();
            $table->string('seo_description', 500)->nullable();
            $table->text('search_text')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'published_at']);
            $table->index(['category_id', 'status']);
            $table->index(['is_featured', 'status']);
        });
        DB::statement('CREATE INDEX courses_search_text_trgm ON courses USING gin (search_text gin_trgm_ops)');

        Schema::create('course_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            // Access length after purchase; null = lifetime access.
            $table->unsignedSmallInteger('duration_days')->nullable();
            // Money is stored in minor units (halalas) to avoid float errors.
            $table->unsignedBigInteger('price_amount');
            $table->unsignedBigInteger('compare_at_amount')->nullable();
            $table->char('currency', 3)->default('SAR');
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['course_id', 'is_active']);
        });

        Schema::create('sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['course_id', 'sort_order']);
        });

        Schema::create('lessons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->foreignId('section_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('type', 20)->default('video');
            $table->text('content')->nullable();
            $table->string('video_provider', 20)->nullable();
            $table->string('video_ref')->nullable();
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->boolean('is_preview')->default(false);
            $table->boolean('is_published')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['section_id', 'sort_order']);
            $table->index(['course_id', 'is_published']);
        });

        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('disk', 20)->default('local');
            $table->string('path');
            $table->string('mime_type', 100)->nullable();
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('type', 20)->default('ebook');
            $table->string('subtitle', 500)->nullable();
            $table->text('description')->nullable();
            $table->string('cover_path')->nullable();
            $table->unsignedBigInteger('price_amount');
            $table->unsignedBigInteger('compare_at_amount')->nullable();
            $table->char('currency', 3)->default('SAR');
            $table->string('status', 20)->default('draft');
            $table->boolean('is_featured')->default(false);
            $table->timestamp('published_at')->nullable();
            // Private deliverable; only served to entitled buyers.
            $table->string('file_disk', 20)->default('local');
            $table->string('file_path')->nullable();
            $table->string('seo_title')->nullable();
            $table->string('seo_description', 500)->nullable();
            $table->text('search_text')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'published_at']);
            $table->index(['type', 'status']);
        });
        DB::statement('CREATE INDEX products_search_text_trgm ON products USING gin (search_text gin_trgm_ops)');

        Schema::create('tags', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->timestamps();
        });

        Schema::create('taggables', function (Blueprint $table) {
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
            $table->morphs('taggable');

            $table->primary(['tag_id', 'taggable_type', 'taggable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('taggables');
        Schema::dropIfExists('tags');
        Schema::dropIfExists('products');
        Schema::dropIfExists('attachments');
        Schema::dropIfExists('lessons');
        Schema::dropIfExists('sections');
        Schema::dropIfExists('course_plans');
        Schema::dropIfExists('courses');
        Schema::dropIfExists('instructors');
        Schema::dropIfExists('categories');
    }
};
