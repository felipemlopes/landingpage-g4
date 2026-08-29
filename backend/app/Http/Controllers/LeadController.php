<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Services\DiagnosisEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class LeadController extends Controller
{
    public function __construct(private DiagnosisEngine $diagnosis) {}

    /**
     * Salva um novo lead (rota pública — chamada pelo frontend após o quiz).
     *
     * O score/nível/gargalo não vêm mais do frontend: são calculados aqui a
     * partir de `answers` pelo DiagnosisEngine, para ser a fonte única de
     * verdade do diagnóstico (ver requirements.md — Requisito 2.7).
     * Formato de cada item de `answers`: ver docblock de DiagnosisEngine.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'                     => 'required|string|max:255',
            'phone'                    => 'required|string|max:20',
            'email'                    => 'nullable|email|max:255',
            'answers'                  => 'required|array|min:1',
            'answers.*.category_slug'  => 'nullable|string',
            'answers.*.type'           => 'required|string|in:texto_livre,escolha_unica,multipla_com_outra',
            'answers.*.scored'         => 'nullable|boolean',
            'answers.*.points'         => 'nullable|integer|min:0|max:100',
            'answers.*.value'          => 'nullable',
            'answers.*.other_text'     => 'nullable|string',
        ]);

        $diagnosis = $this->diagnosis->compute($data['answers']);

        $lead = Lead::create([
            'name'                 => $data['name'],
            'phone'                => $data['phone'],
            'email'                => $data['email'] ?? null,
            'answers'              => $data['answers'],
            'score'                => $diagnosis['score'],
            'level'                => $diagnosis['level'],
            'bottleneck_category'  => $diagnosis['bottleneck_category'],
            'area_atuacao'         => $this->extractValue($data['answers'], 'area_atuacao'),
            'faturamento_band'     => $this->extractValue($data['answers'], 'faturamento'),
            'intencao_descoberta'  => $this->extractValue($data['answers'], 'intencao_descoberta'),
        ]);

        return response()->json(['lead' => $lead, 'diagnosis' => $diagnosis], 201);
    }

    /**
     * Grava as respostas de qualificação comercial (perguntas 10 e 11, feitas
     * depois do resultado) num lead já existente. Rota pública — o lead ainda
     * não está autenticado, só é identificado pelo id devolvido em `store()`.
     */
    public function qualify(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'intencao_compra'  => 'required|string|max:255',
            'fit_investimento' => 'required|string|max:255',
        ]);

        $lead->update($data);

        return response()->json($lead);
    }

    /** Busca, entre as respostas, o valor de uma pergunta pelo seu category_slug. */
    private function extractValue(array $answers, string $categorySlug): ?string
    {
        foreach ($answers as $answer) {
            if (($answer['category_slug'] ?? null) === $categorySlug) {
                $value = $answer['value'] ?? null;

                return is_array($value) ? implode(', ', $value) : $value;
            }
        }

        return null;
    }

    /**
     * Lista todos os leads (autenticado — admin).
     */
    public function index(): JsonResponse
    {
        $leads = Lead::orderByDesc('created_at')->get();

        return response()->json($leads);
    }

    /**
     * Remove um lead específico (autenticado — admin).
     */
    public function destroy(Lead $lead): JsonResponse
    {
        $lead->delete();

        return response()->json(['message' => 'Lead removido.']);
    }

    /**
     * Remove todos os leads (autenticado — admin).
     */
    public function destroyAll(): JsonResponse
    {
        Lead::truncate();

        return response()->json(['message' => 'Todos os leads foram removidos.']);
    }

    /**
     * Exporta leads como XLSX (autenticado — admin).
     */
    public function exportXlsx(): BinaryFileResponse
    {
        $leads = Lead::orderByDesc('created_at')->get();

        $spreadsheet = new Spreadsheet();
        $sheet       = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Leads');

        $headers = ['Nome', 'WhatsApp', 'Email', 'Score', 'Nível', 'Gargalo', 'Intenção', 'Fit Investimento', 'Data'];
        $sheet->fromArray($headers, null, 'A1');
        $sheet->getStyle('A1:I1')->getFont()->setBold(true);

        $row = 2;
        foreach ($leads as $lead) {
            $sheet->fromArray([
                $lead->name,
                $lead->phone,
                $lead->email ?? '',
                $lead->score,
                $this->levelLabel($lead->level, $lead->score),
                DiagnosisEngine::axisLabel($lead->bottleneck_category),
                $lead->intencao_compra ?? '—',
                $lead->fit_investimento ?? '—',
                $lead->created_at?->format('d/m/Y H:i') ?? '',
            ], null, "A{$row}");
            $row++;
        }

        foreach (range('A', 'I') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $filename = 'leads-g4-' . now()->format('Y-m-d') . '.xlsx';
        $stub     = tempnam(sys_get_temp_dir(), 'leads_');
        $tmpPath  = $stub . '.xlsx';
        rename($stub, $tmpPath);

        (new Xlsx($spreadsheet))->save($tmpPath);

        return response()->download($tmpPath, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    private function scoreLabel(int $score): string
    {
        if ($score >= 75) return 'Avançado';
        if ($score >= 50) return 'Em Transição';
        if ($score >= 25) return 'Inicial';

        return 'Crítico';
    }

    /** Rótulo do nível do diagnóstico de escritório; cai no legado se `level` ainda não foi calculado. */
    private function levelLabel(?int $level, int $score): string
    {
        $labels = [
            1 => 'Nível 1 — Dependente de Indicação',
            2 => 'Nível 2 — Em Estruturação',
            3 => 'Nível 3 — Em Crescimento',
            4 => 'Nível 4 — Previsível',
        ];

        return $labels[$level] ?? $this->scoreLabel($score);
    }
}
