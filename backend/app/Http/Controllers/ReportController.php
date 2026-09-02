<?php

namespace App\Http\Controllers;

use App\Jobs\GenerateDiagnosticReportJob;
use App\Models\Lead;
use App\Models\Report;
use App\Services\DiagnosticReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ReportController extends Controller
{
    public function __construct(private DiagnosticReportService $reports) {}

    /**
     * Enfileira a geração do diagnóstico (IA + PDF + WhatsApp) e devolve um id para polling.
     * Chamado logo após a criação do lead.
     */
    public function generate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lead_id'   => 'nullable|integer|exists:leads,id',
            'name'      => 'required|string',
            'phone'     => 'required|string',
            'score'     => 'required|integer',
            'answers'   => 'nullable|array',
            'questions' => 'nullable|array',
        ]);

        $report = Report::create([
            'token'   => Str::random(48),
            'lead_id' => $data['lead_id'] ?? null,
            'status'  => 'pending',
            'payload' => $data,
        ]);

        GenerateDiagnosticReportJob::dispatch($report->id);

        return response()->json([
            'report_id' => $report->token,
            'status'    => $report->status,
        ], 202);
    }

    /**
     * Consulta o status/resultado de um relatório em processamento (polling público).
     * Resolvido pelo token opaco (não pelo id sequencial), para não permitir enumerar
     * diagnósticos de outros leads.
     */
    public function show(Report $report): JsonResponse
    {
        $payload = [
            'status'        => $report->status,
            'whatsapp_sent' => $report->whatsapp_sent,
            'error'         => $report->status === 'failed' ? $report->error : null,
        ];

        if ($report->status === 'done' && $report->pdf_path && Storage::disk('local')->exists($report->pdf_path)) {
            $payload['pdf']      = base64_encode(Storage::disk('local')->get($report->pdf_path));
            $payload['filename'] = $report->filename;
        }

        return response()->json($payload);
    }

    /**
     * Reenvia o PDF já gerado de um lead pelo WhatsApp, sem chamar a IA novamente (admin).
     */
    public function resend(Lead $lead): JsonResponse
    {
        $path = "reports/{$lead->id}.pdf";

        if (!Storage::disk('local')->exists($path)) {
            return response()->json(['message' => 'PDF ainda não foi gerado para este lead.'], 404);
        }

        if (!$this->reports->isWhatsAppEnabled()) {
            return response()->json(['message' => 'Nenhum provider de WhatsApp está configurado.'], 422);
        }

        $base64   = base64_encode(Storage::disk('local')->get($path));
        $filename = 'diagnostico-' . Str::slug(config('app.name')) . "-{$lead->id}.pdf";
        $level    = $this->reports->levelFor($lead->score);

        [$whatsappSent, $whatsappError] = $this->reports->deliverViaWhatsApp(
            $lead->phone,
            $lead->name,
            $lead->score,
            $level,
            $base64,
            $filename,
        );

        $lead->whatsapp_status = $whatsappSent ? 'sent' : 'failed';
        $lead->whatsapp_error  = $whatsappError;
        $lead->save();

        return response()->json([
            'whatsapp_sent'   => $whatsappSent,
            'whatsapp_status' => $lead->whatsapp_status,
            'whatsapp_error'  => $whatsappError,
        ]);
    }
}
