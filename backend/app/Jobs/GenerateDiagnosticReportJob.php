<?php

namespace App\Jobs;

use App\Models\Lead;
use App\Models\Report;
use App\Services\DiagnosticReportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class GenerateDiagnosticReportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $timeout = 90;

    public function __construct(private int $reportId) {}

    public function handle(DiagnosticReportService $reports): void
    {
        $report = Report::find($this->reportId);
        if (!$report) return;

        $data  = $report->payload;
        $built = $reports->build($data);

        $pdfPath = "reports/report-{$report->id}.pdf";
        Storage::disk('local')->put($pdfPath, $built['pdfContent']);

        $lead = $report->lead_id ? Lead::find($report->lead_id) : null;
        if ($lead) {
            // Mesmo caminho usado pelo botão "Reenviar" do admin (busca por lead_id).
            Storage::disk('local')->put("reports/{$lead->id}.pdf", $built['pdfContent']);
        }

        $whatsappSent  = false;
        $whatsappError = null;

        if ($reports->isWhatsAppEnabled()) {
            [$whatsappSent, $whatsappError] = $reports->deliverViaWhatsApp(
                $data['phone'],
                $data['name'],
                $data['score'],
                $built['level'],
                base64_encode($built['pdfContent']),
                $built['filename'],
            );
        }

        $report->status        = 'done';
        $report->filename      = $built['filename'];
        $report->pdf_path      = $pdfPath;
        $report->whatsapp_sent = $whatsappSent;
        $report->error         = $whatsappError;
        $report->save();

        if ($lead) {
            $lead->report_generated_at = now();
            $lead->ai_provider_used    = $built['aiProvider'];
            $lead->whatsapp_status     = !$reports->isWhatsAppEnabled() ? 'disabled' : ($whatsappSent ? 'sent' : 'failed');
            $lead->whatsapp_error      = $whatsappError;
            $lead->save();
        }
    }

    public function failed(\Throwable $e): void
    {
        $report = Report::find($this->reportId);
        if ($report) {
            $report->status = 'failed';
            $report->error  = $e->getMessage();
            $report->save();
        }
    }
}
