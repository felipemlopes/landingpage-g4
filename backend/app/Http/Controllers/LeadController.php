<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class LeadController extends Controller
{
    /**
     * Salva um novo lead (rota pública — chamada pelo frontend após o quiz).
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'    => 'required|string|max:255',
            'phone'   => 'required|string|max:20',
            'email'   => 'nullable|email|max:255',
            'score'   => 'required|integer|min:0|max:100',
            'answers' => 'nullable|array',
        ]);

        $lead = Lead::create($data);

        return response()->json($lead, 201);
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
     * Exporta leads como CSV (autenticado — admin).
     */
    public function exportCsv(): Response
    {
        $leads = Lead::orderByDesc('created_at')->get();

        $rows   = [];
        $rows[] = implode(',', ['Nome', 'WhatsApp', 'Email', 'Score', 'Nível', 'Data']);

        foreach ($leads as $lead) {
            $level = $this->scoreLabel($lead->score);
            $date  = $lead->created_at?->format('d/m/Y H:i') ?? '';
            $rows[] = implode(',', array_map(
                fn ($v) => '"' . str_replace('"', '""', (string) $v) . '"',
                [$lead->name, $lead->phone, $lead->email ?? '', $lead->score, $level, $date]
            ));
        }

        $csv      = "\xEF\xBB\xBF" . implode("\n", $rows);
        $filename = 'leads-g4-' . now()->format('Y-m-d') . '.csv';

        return response($csv, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    private function scoreLabel(int $score): string
    {
        if ($score >= 75) return 'Avançado';
        if ($score >= 50) return 'Em Transição';
        if ($score >= 25) return 'Inicial';

        return 'Crítico';
    }
}
