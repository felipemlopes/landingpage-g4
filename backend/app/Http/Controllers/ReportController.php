<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Services\GeminiService;
use App\Services\WhatsAppService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(
        private GeminiService  $gemini,
        private WhatsAppService $whatsapp,
    ) {}

    /**
     * Gera o PDF do diagnóstico e envia pelo WhatsApp.
     * Chamado logo após a criação do lead.
     */
    public function generate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'      => 'required|string',
            'phone'     => 'required|string',
            'score'     => 'required|integer',
            'answers'   => 'nullable|array',
            'questions' => 'nullable|array',
        ]);

        // 1. Gera conteúdo com Gemini
        try {
            $reportHtml = $this->gemini->generateReport($data);
        } catch (\Exception $e) {
            $reportHtml = $this->fallbackReport($data);
        }

        // 2. Monta eixos por categoria dinamicamente
        $axes = $this->buildAxes($data['questions'] ?? [], $data['answers'] ?? []);

        $level = match (true) {
            $data['score'] >= 75 => 'Maturidade Avançada',
            $data['score'] >= 50 => 'Em Transição',
            $data['score'] >= 25 => 'Maturidade Inicial',
            default              => 'Diagnóstico Crítico',
        };

        // 3. Gera PDF
        $pdf = Pdf::loadView('pdf.report', [
            'name'       => $data['name'],
            'score'      => $data['score'],
            'level'      => $level,
            'axes'       => $axes,
            'reportHtml' => $reportHtml,
            'date'       => now()->format('d/m/Y'),
        ])->setPaper('a4', 'portrait');

        $pdfContent = $pdf->output();
        $base64     = base64_encode($pdfContent);
        $filename   = 'diagnostico-g4-' . now()->format('Y-m-d') . '.pdf';

        // 4. Envia pelo WhatsApp (se Evolution API configurada)
        $whatsappSent = false;
        if ($this->whatsapp->isEnabled()) {
            // Mensagem de texto primeiro
            $this->whatsapp->sendText(
                $data['phone'],
                "Olá, *{$data['name']}*! 👋\n\nSeu diagnóstico comercial está pronto. Você alcançou *{$data['score']}/100 pontos* — nível *{$level}*.\n\nSegue em anexo seu relatório personalizado com o plano de crescimento. Nossa equipe entrará em contato em breve! 🚀"
            );

            // Envia o PDF
            $whatsappSent = $this->whatsapp->sendDocument(
                $data['phone'],
                $base64,
                $filename,
                '📊 Diagnóstico Comercial G4 Business'
            );
        }

        return response()->json([
            'pdf'           => $base64,
            'filename'      => $filename,
            'whatsapp_sent' => $whatsappSent,
        ]);
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
            $avg   = (int) round(array_sum($pts) / count($pts));
            return ['label' => $label, 'avg' => $avg];
        }, array_keys($categoryMap), array_values($categoryMap));
    }

    private function fallbackReport(array $data): string
    {
        $level = match (true) {
            $data['score'] >= 75 => 'Maturidade Avançada',
            $data['score'] >= 50 => 'Em Transição',
            $data['score'] >= 25 => 'Maturidade Inicial',
            default              => 'Diagnóstico Crítico',
        };

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
