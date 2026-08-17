<?php

namespace App\Services;

use App\Services\AI\AIReportProviderInterface;
use App\Services\WhatsApp\WhatsAppProviderInterface;
use Barryvdh\DomPDF\Facade\Pdf;

/**
 * Monta o conteúdo do diagnóstico (IA + PDF) e cuida do envio via WhatsApp.
 * Usado tanto pelo job assíncrono de geração quanto pelo reenvio manual (admin).
 */
class DiagnosticReportService
{
    public function __construct(
        private AIReportProviderInterface $ai,
        private WhatsAppProviderInterface $whatsapp,
    ) {}

    public function isWhatsAppEnabled(): bool
    {
        return $this->whatsapp->isEnabled();
    }

    public function levelFor(int $score): string
    {
        return match (true) {
            $score >= 75 => 'Maturidade Avançada',
            $score >= 50 => 'Em Transição',
            $score >= 25 => 'Maturidade Inicial',
            default      => 'Diagnóstico Crítico',
        };
    }

    /**
     * Gera o texto (IA com fallback) e monta o PDF.
     * @return array{aiProvider: string, pdfContent: string, filename: string, level: string}
     */
    public function build(array $data): array
    {
        $aiProvider = config('services.ai.provider', 'openai');

        try {
            $html = $this->ai->generateReport($data);
        } catch (\Exception $e) {
            $html       = $this->fallbackReport($data);
            $aiProvider = 'fallback';
        }

        $axes  = $this->buildAxes($data['questions'] ?? [], $data['answers'] ?? []);
        $level = $this->levelFor($data['score']);

        $pdf = Pdf::loadView('pdf.report', [
            'name'       => $data['name'],
            'score'      => $data['score'],
            'level'      => $level,
            'axes'       => $axes,
            'reportHtml' => $html,
            'date'       => now()->format('d/m/Y'),
        ])->setPaper('a4', 'portrait');

        return [
            'aiProvider' => $aiProvider,
            'pdfContent' => $pdf->output(),
            'filename'   => 'diagnostico-g4-' . now()->format('Y-m-d') . '.pdf',
            'level'      => $level,
        ];
    }

    /**
     * Envia a mensagem de texto + PDF pelo WhatsApp, capturando erros sem propagar exceção.
     * @return array{0: bool, 1: ?string} [enviado, mensagem de erro]
     */
    public function deliverViaWhatsApp(string $phone, string $name, int $score, string $level, string $base64Pdf, string $filename): array
    {
        try {
            $this->whatsapp->sendText(
                $phone,
                "Olá, *{$name}*! 👋\n\nSeu diagnóstico comercial está pronto. Você alcançou *{$score}/100 pontos* — nível *{$level}*.\n\nSegue em anexo seu relatório personalizado com o plano de crescimento. Nossa equipe entrará em contato em breve! 🚀"
            );

            $sent = $this->whatsapp->sendDocument($phone, $base64Pdf, $filename, '📊 Diagnóstico Comercial G4 Business');

            return [$sent, $sent ? null : 'O provider de WhatsApp recusou o envio.'];
        } catch (\Throwable $e) {
            return [false, $e->getMessage()];
        }
    }

    private function buildAxes(array $questions, array $answers): array
    {
        $categoryMap = [];
        foreach ($questions as $i => $q) {
            $cat = $q['category'] ?? 'Geral';
            if (!isset($categoryMap[$cat])) $categoryMap[$cat] = [];
            $categoryMap[$cat][] = (int)($answers[$i] ?? 50);
        }

        return array_map(function ($label, $pts) {
            $avg = (int) round(array_sum($pts) / count($pts));
            return ['label' => $label, 'avg' => $avg];
        }, array_keys($categoryMap), array_values($categoryMap));
    }

    private function fallbackReport(array $data): string
    {
        $level = $this->levelFor($data['score']);

        return "
        <div class='section'>
            <h2>Olá, {$data['name']}!</h2>
            <p>Obrigado por completar o diagnóstico comercial da G4 Business. Seu resultado mostra um score de <strong>{$data['score']}/100</strong>, classificado como <strong>{$level}</strong>.</p>
        </div>
        <div class='highlight'>
            <h3>Próximos Passos</h3>
            <p>Nossa equipe comercial entrará em contato para apresentar um plano personalizado de crescimento baseado nas suas respostas.</p>
        </div>
        ";
    }
}
