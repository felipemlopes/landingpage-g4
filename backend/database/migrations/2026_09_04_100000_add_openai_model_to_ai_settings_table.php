<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_settings', function (Blueprint $table) {
            $table->string('openai_model')->nullable()->after('openai_api_key');
        });

        // Semeia com o valor atual do .env (G4_OPENAI_MODEL) — mesmo raciocínio
        // da migração original de ai_settings: não deixar a linha existente
        // nascer sem modelo, o que cairia no fallback só na próxima leitura.
        DB::table('ai_settings')
            ->where('id', 1)
            ->update(['openai_model' => env('G4_OPENAI_MODEL', 'gpt-4o-mini')]);
    }

    public function down(): void
    {
        Schema::table('ai_settings', function (Blueprint $table) {
            $table->dropColumn('openai_model');
        });
    }
};
