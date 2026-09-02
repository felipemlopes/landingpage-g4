<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pixel_settings', function (Blueprint $table) {
            $table->id();
            // ID do Pixel da Meta configurado pelo admin (Integrações). Não é
            // dado sensível (fica visível no HTML/JS de qualquer site que o
            // usa) — leitura pública, mesmo padrão de calendly_settings.
            $table->string('meta_pixel_id', 32)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pixel_settings');
    }
};
