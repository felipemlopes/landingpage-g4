<?php

namespace App\Services;

use App\Models\MessageSetting;
use App\Services\AI\AIReportProviderInterface;
use App\Services\WhatsApp\WhatsAppProviderInterface;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Str;

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

    /**
     * Template padrão da mensagem de texto enviada junto do PDF — usado
     * quando o admin nunca configurou (ou limpou) um template customizado em
     * Integrações. Suporta as variáveis {nome}, {pontuacao} e {nivel}.
     */
    public const DEFAULT_WHATSAPP_TEMPLATE =
        "Olá, *{nome}*! 👋\n\nSeu diagnóstico comercial está pronto. Você alcançou *{pontuacao}/100 pontos* — nível *{nivel}*.\n\nSegue em anexo seu relatório personalizado com o plano de crescimento. Nossa equipe entrará em contato em breve! 🚀";

    private const GENERIC_LEVEL_LABELS = [
        4 => 'Maturidade Avançada',
        3 => 'Em Transição',
        2 => 'Maturidade Inicial',
        1 => 'Diagnóstico Crítico',
    ];

    public function levelFor(int $score): string
    {
        return self::GENERIC_LEVEL_LABELS[LevelClassifier::levelFor($score)];
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
            'filename'   => 'diagnostico-' . Str::slug(config('app.name')) . '-' . now()->format('Y-m-d') . '.pdf',
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
            $template = MessageSetting::current()->whatsapp_message_template ?: self::DEFAULT_WHATSAPP_TEMPLATE;
            $message  = strtr($template, [
                '{nome}'      => $name,
                '{pontuacao}' => (string) $score,
                '{nivel}'     => $level,
            ]);

            $this->whatsapp->sendText($phone, $message);

            // Legenda do PDF anexado continua fixa — fora de escopo (Requisito 1.7)
            $sent = $this->whatsapp->sendDocument($phone, $base64Pdf, $filename, '📊 Diagnóstico Comercial ' . config('app.name'));

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
            <p>Obrigado por completar o diagnóstico comercial da " . config('app.name') . ". Seu resultado mostra um score de <strong>{$data['score']}/100</strong>, classificado como <strong>{$level}</strong>.</p>
        </div>
        <div class='highlight'>
            <h3>Próximos Passos</h3>
            <p>Nossa equipe comercial entrará em contato para apresentar um plano personalizado de crescimento baseado nas suas respostas.</p>
        </div>
        ";
    }
}
