<?php

namespace App\Http\Controllers;

use App\Models\MessageSetting;
use App\Services\DiagnosticReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessageSettingController extends Controller
{
    /**
     * Configuração atual (admin). Devolve o template padrão junto para o
     * frontend usar como placeholder/preview sem duplicar a string em JS.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'whatsapp_message_template' => MessageSetting::current()->whatsapp_message_template,
            'whatsapp_message_default'  => DiagnosticReportService::DEFAULT_WHATSAPP_TEMPLATE,
        ]);
    }

    /**
     * Atualiza o template (admin). Vazio = volta a usar o padrão embutido em
     * DiagnosticReportService — nunca fica sem mensagem (Requisito 1.4).
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'whatsapp_message_template' => 'nullable|string|max:4096',
        ]);

        $settings = MessageSetting::current();
        $settings->whatsapp_message_template = $data['whatsapp_message_template'] ?: null;
        $settings->save();

        return response()->json([
            'whatsapp_message_template' => $settings->whatsapp_message_template,
            'whatsapp_message_default'  => DiagnosticReportService::DEFAULT_WHATSAPP_TEMPLATE,
        ]);
    }
}
