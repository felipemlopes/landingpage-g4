<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('message_settings', function (Blueprint $table) {
            $table->id();
            // Template da mensagem de texto enviada junto do PDF no WhatsApp,
            // editável pelo admin (Integrações). Vazio = usa o padrão embutido
            // em DiagnosticReportService::DEFAULT_WHATSAPP_TEMPLATE — nunca fica
            // sem mensagem (ver Requisito 1.4 de
            // .kiro/specs/whatsapp-pixel-meta-textos-hero).
            $table->text('whatsapp_message_template')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message_settings');
    }
};
