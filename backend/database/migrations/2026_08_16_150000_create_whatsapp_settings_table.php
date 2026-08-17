<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('whatsapp_settings', function (Blueprint $table) {
            $table->id();
            // evolution | official — a URL e a API Key da Evolution ficam no .env,
            // o resto (inclusive qual provider está ativo) é configurado pelo admin.
            $table->string('provider')->default('evolution');
            $table->text('cloud_token')->nullable();
            $table->string('cloud_phone_number_id')->nullable();
            $table->string('cloud_waba_id')->nullable();
            $table->string('cloud_verify_token')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_settings');
    }
};
