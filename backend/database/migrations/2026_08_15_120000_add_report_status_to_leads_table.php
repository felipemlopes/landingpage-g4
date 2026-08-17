<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->timestamp('report_generated_at')->nullable()->after('answers');
            $table->string('ai_provider_used')->nullable()->after('report_generated_at');
            $table->enum('whatsapp_status', ['pending', 'sent', 'failed', 'disabled'])->default('pending')->after('ai_provider_used');
            $table->text('whatsapp_error')->nullable()->after('whatsapp_status');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn(['report_generated_at', 'ai_provider_used', 'whatsapp_status', 'whatsapp_error']);
        });
    }
};
