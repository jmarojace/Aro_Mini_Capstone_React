<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $t) {
            $t->id();
            $t->string('name')->unique();
            $t->text('description')->nullable();
            $t->timestamps();
        });
        Schema::create('products', function (Blueprint $t) {
            $t->id();
            $t->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $t->string('name');
            $t->string('sku')->unique();
            $t->text('description')->nullable();
            $t->string('image_url')->nullable();
            $t->decimal('price', 12, 2);
            $t->boolean('active')->default(true);
            $t->timestamps();
            $t->index(['category_id', 'active']);
        });
        Schema::create('inventory_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('product_id')->unique()->constrained()->cascadeOnDelete();
            $t->unsignedInteger('stock_quantity')->default(0);
            $t->unsignedInteger('reorder_level')->default(5);
            $t->timestamps();
        });
        Schema::create('sales', function (Blueprint $t) {
            $t->id();
            $t->string('invoice_number')->unique();
            $t->foreignId('user_id')->constrained()->restrictOnDelete();
            $t->decimal('total_amount', 12, 2);
            $t->string('payment_method')->default('cash');
            $t->timestamps();
        });
        Schema::create('sale_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $t->foreignId('product_id')->constrained()->restrictOnDelete();
            $t->unsignedInteger('quantity');
            $t->decimal('unit_price', 12, 2);
            $t->decimal('line_total', 12, 2);
            $t->timestamps();
        });
        Schema::create('inventory_transactions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('product_id')->constrained()->restrictOnDelete();
            $t->string('transaction_type');
            $t->string('reference_type');
            $t->unsignedBigInteger('reference_id')->nullable();
            $t->integer('quantity');
            $t->text('notes')->nullable();
            $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $t->timestamps();
            $t->index(['reference_type', 'reference_id']);
        });
        Schema::create('restock_requests', function (Blueprint $t) {
            $t->id();
            $t->foreignId('product_id')->constrained()->cascadeOnDelete();
            $t->foreignId('requested_by')->constrained('users')->restrictOnDelete();
            $t->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $t->unsignedInteger('quantity');
            $t->string('status')->default('pending');
            $t->text('notes')->nullable();
            $t->timestamp('received_at')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['restock_requests', 'inventory_transactions', 'sale_items', 'sales', 'inventory_items', 'products', 'categories'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
