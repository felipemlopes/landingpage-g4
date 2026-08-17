<?php

namespace App\Services\AI;

interface AIReportProviderInterface
{
    /**
     * Gera o relatório de diagnóstico comercial em HTML.
     */
    public function generateReport(array $data): string;
}
