<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            // Segmentação (perguntas 1 e 2 do quiz — não pontuam).
            $table->string('area_atuacao')->nullable()->after('answers');
            $table->string('faturamento_band')->nullable()->after('area_atuacao');

            // Resultado do DiagnosisEngine (calculado no backend a partir de `answers`).
            $table->unsignedTinyInteger('level')->nullable()->after('score');
            $table->string('bottleneck_category')->nullable()->after('level');

            // Personalização + qualificação comercial (perguntas 9, 10 e 11 do briefing).
            $table->string('intencao_descoberta')->nullable()->after('bottleneck_category');
            $table->string('intencao_compra')->nullable()->after('intencao_descoberta');
            $table->string('fit_investimento')->nullable()->after('intencao_compra');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn([
                'area_atuacao',
                'faturamento_band',
                'level',
                'bottleneck_category',
                'intencao_descoberta',
                'intencao_compra',
                'fit_investimento',
            ]);
        });
    }
};
