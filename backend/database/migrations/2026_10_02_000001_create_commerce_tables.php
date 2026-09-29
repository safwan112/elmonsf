<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Commerce: carts, coupons, orders, payments, webhooks, invoices, refunds
 * and what purchases grant (enrollments, product entitlements).
 * All money columns are integers in minor units (halalas).
 */
return new class extends Migration
{
    public function up(): void
    {
        // Gap-free, per-year document numbers (orders, invoices).
        Schema::create('document_sequences', function (Blueprint $table) {
            $table->string('name', 32);
            $table->unsignedSmallInteger('year');
            $table->unsignedInteger('last_value')->default(0);
            $table->primary(['name', 'year']);
        });

        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('description')->nullable();
            $table->string('type', 10); // percent | fixed
            $table->unsignedBigInteger('value'); // percent (1-100) or amount in halalas
            $table->unsignedBigInteger('max_discount_amount')->nullable();
            $table->unsignedBigInteger('min_subtotal_amount')->nullable();
            $table->string('applies_to', 10)->default('all'); // all | courses | products
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedInteger('usage_limit_per_user')->nullable();
            $table->unsignedInteger('used_count')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('carts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('coupon_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cart_id')->constrained()->cascadeOnDelete();
            $table->string('purchasable_type', 20); // course_plan | product
            $table->unsignedBigInteger('purchasable_id');
            // For plans: the course, so a cart holds at most one plan per course.
            $table->foreignId('course_id')->nullable()->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['cart_id', 'purchasable_type', 'purchasable_id']);
            $table->unique(['cart_id', 'course_id']);
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('number', 32)->unique();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('status', 20)->default('pending');
            $table->char('currency', 3)->default('SAR');
            $table->unsignedBigInteger('subtotal_amount');
            $table->unsignedBigInteger('discount_amount')->default(0);
            $table->unsignedBigInteger('tax_amount')->default(0); // VAT included in total
            $table->unsignedBigInteger('total_amount');
            $table->foreignId('coupon_id')->nullable()->constrained()->nullOnDelete();
            $table->string('coupon_code', 40)->nullable();
            $table->string('billing_name');
            $table->string('billing_email');
            $table->string('billing_phone', 32)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->string('failure_reason')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['status', 'created_at']);
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('purchasable_type', 20);
            $table->unsignedBigInteger('purchasable_id');
            $table->foreignId('course_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            // Snapshot at purchase time: later catalog edits never change orders.
            $table->string('title');
            $table->string('plan_name')->nullable();
            $table->unsignedSmallInteger('duration_days')->nullable();
            $table->unsignedBigInteger('unit_amount');
            $table->unsignedBigInteger('discount_amount')->default(0);
            $table->unsignedBigInteger('total_amount');
            $table->timestamps();
        });

        Schema::create('coupon_redemptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coupon_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('discount_amount');
            $table->timestamps();

            $table->index(['coupon_id', 'user_id']);
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->restrictOnDelete();
            $table->string('provider', 30);
            $table->string('status', 20)->default('pending');
            $table->unsignedBigInteger('amount');
            $table->char('currency', 3);
            $table->string('provider_invoice_id', 100)->nullable();
            $table->string('provider_payment_id', 100)->nullable();
            $table->text('payment_url')->nullable();
            $table->string('failure_reason')->nullable();
            // Paid for an order that was already paid by another payment.
            $table->boolean('is_duplicate')->default(false);
            $table->timestamp('verified_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->jsonb('gateway_response')->nullable();
            $table->timestamps();

            $table->unique(['provider', 'provider_invoice_id']);
            $table->index(['provider', 'provider_payment_id']);
            $table->index(['order_id', 'status']);
        });

        Schema::create('payment_webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('provider', 30);
            $table->string('idempotency_key', 128);
            $table->string('event_type', 64)->nullable();
            $table->string('provider_invoice_id', 100)->nullable();
            $table->string('provider_payment_id', 100)->nullable();
            $table->boolean('signature_valid')->default(false);
            $table->string('status', 20)->default('received'); // received | processed | ignored | failed
            $table->jsonb('payload');
            $table->text('error')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->unique(['provider', 'idempotency_key']);
            $table->index('provider_invoice_id');
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('number', 32)->unique();
            $table->foreignId('order_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->char('currency', 3);
            $table->unsignedBigInteger('subtotal_amount');
            $table->unsignedBigInteger('discount_amount');
            $table->unsignedBigInteger('tax_amount');
            $table->unsignedBigInteger('total_amount');
            $table->unsignedTinyInteger('vat_rate');
            $table->jsonb('seller');
            $table->jsonb('buyer');
            $table->jsonb('lines');
            $table->timestamp('issued_at');
            $table->timestamps();
        });

        Schema::create('refunds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->restrictOnDelete();
            $table->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('amount');
            $table->char('currency', 3);
            $table->string('reason', 500);
            $table->string('method', 20)->default('manual'); // manual | gateway
            $table->string('status', 20)->default('succeeded');
            $table->string('provider_refund_id', 100)->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('course_plan_id')->nullable()->constrained()->nullOnDelete();
            $table->string('source', 20)->default('purchase'); // purchase | admin | gift
            $table->string('status', 20)->default('active'); // active | expired | revoked
            $table->timestamp('starts_at');
            $table->timestamp('expires_at')->nullable(); // null = lifetime
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            // One enrollment per user and course: repurchases extend it.
            $table->unique(['user_id', 'course_id']);
            $table->index(['status', 'expires_at']);
        });

        Schema::create('product_entitlements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('granted_at');
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'product_id']);
        });

        // A single successful payment per order at the database level.
        DB::statement("CREATE UNIQUE INDEX payments_one_paid_per_order ON payments (order_id) WHERE status = 'paid' AND is_duplicate = false");
    }

    public function down(): void
    {
        foreach ([
            'product_entitlements', 'enrollments', 'refunds', 'invoices', 'payment_webhook_events',
            'payments', 'coupon_redemptions', 'order_items', 'orders', 'cart_items', 'carts', 'coupons',
            'document_sequences',
        ] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
