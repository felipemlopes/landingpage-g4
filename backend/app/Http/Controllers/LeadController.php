<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

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
     * Exporta leads como XLSX (autenticado — admin).
     */
    public function exportXlsx(): BinaryFileResponse
    {
        $leads = Lead::orderByDesc('created_at')->get();

        $spreadsheet = new Spreadsheet();
        $sheet       = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Leads');

        $headers = ['Nome', 'WhatsApp', 'Email', 'Score', 'Nível', 'Data'];
        $sheet->fromArray($headers, null, 'A1');
        $sheet->getStyle('A1:F1')->getFont()->setBold(true);

        $row = 2;
        foreach ($leads as $lead) {
            $sheet->fromArray([
                $lead->name,
                $lead->phone,
                $lead->email ?? '',
                $lead->score,
                $this->scoreLabel($lead->score),
                $lead->created_at?->format('d/m/Y H:i') ?? '',
            ], null, "A{$row}");
            $row++;
        }

        foreach (range('A', 'F') as $col) {
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
}
