<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Opt-out for announcement emails (transactional mail is always sent).
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('marketing_emails')->default(true)->after('locale');
        });

        // Expiry reminders are sent once per window.
        Schema::table('enrollments', function (Blueprint $table) {
            $table->timestamp('reminded_7d_at')->nullable()->after('revoked_at');
            $table->timestamp('reminded_1d_at')->nullable()->after('reminded_7d_at');
        });

        // Announcements sent by admins to an audience.
        Schema::create('broadcasts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sent_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title', 150);
            $table->text('body');
            $table->string('url')->nullable();
            $table->string('audience', 20); // all | students | instructors | course
            $table->foreignId('course_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('send_email')->default(false);
            $table->string('status', 20)->default('queued'); // queued | sending | sent | failed
            $table->unsignedInteger('recipients_count')->default(0);
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('broadcasts');
        Schema::table('enrollments', fn (Blueprint $table) => $table->dropColumn(['reminded_7d_at', 'reminded_1d_at']));
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('marketing_emails'));
    }
};
