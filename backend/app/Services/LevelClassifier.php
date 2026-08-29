<?php

namespace App\Services;

/**
 * Corte numérico único (75/50/25) usado para classificar um score de 0-100 em
 * um nível de 1 a 4. Os rótulos de cada nível ficam a cargo de quem consome
 * (DiagnosticReportService usa rótulos genéricos legados; DiagnosisEngine usa
 * os rótulos do diagnóstico de escritórios) — só o corte é compartilhado, para
 * não ter o mesmo número mágico duplicado em dois lugares.
 */
class LevelClassifier
{
    public static function levelFor(int $score): int
    {
        return match (true) {
            $score >= 75 => 4,
            $score >= 50 => 3,
            $score >= 25 => 2,
            default      => 1,
        };
    }
}
