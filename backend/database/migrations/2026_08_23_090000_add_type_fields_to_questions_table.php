<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->enum('type', ['texto_livre', 'escolha_unica', 'multipla_com_outra'])
                ->default('escolha_unica')
                ->after('text');
            // Eixo fixo usado pelo DiagnosisEngine (score/gargalo). Null = pergunta de
            // segmentação/qualificação que não participa do cálculo de maturidade.
            $table->string('category_slug')->nullable()->after('category');
            $table->boolean('scored')->default(true)->after('type');
            $table->boolean('allow_other')->default(false)->after('scored');
        });
    }

    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->dropColumn(['type', 'category_slug', 'scored', 'allow_other']);
        });
    }
};
