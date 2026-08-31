<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_settings', function (Blueprint $table) {
            $table->id();
            // API key da OpenAI — o admin edita pelo painel (Integrações); o
            // .env passa a ser só o valor inicial/fallback (ver Requisito 2.2
            // de .kiro/specs/openai-key-configuravel-admin).
            $table->text('openai_api_key')->nullable();
            $table->timestamps();
        });

        // Semeia com o valor atual do .env para não interromper a geração de
        // relatórios entre este deploy e a primeira vez que um admin abrir a
        // tela de Integrações — ver design.md, "Por que semear o banco na
        // migração, diferente da spec do Calendly".
        DB::table('ai_settings')->insert([
            'openai_api_key' => env('OPENAI_API_KEY'),
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_settings');
    }
};
