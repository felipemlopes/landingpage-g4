<?php

namespace App\Http\Controllers;

use App\Models\WhatsappSetting;
use App\Services\WhatsApp\WhatsAppProviderInterface;
use App\Support\Masks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WhatsAppController extends Controller
{
    public function __construct(private WhatsAppProviderInterface $whatsapp) {}

    /**
     * Status de conexão do provider ativo (admin).
     */
    public function status(): JsonResponse
    {
        $status = $this->whatsapp->connectionStatus();

        return response()->json([
            'provider'  => WhatsappSetting::current()->provider,
            'connected' => $status['connected'],
            'detail'    => $status['detail'],
        ]);
    }

    /**
     * Inicia a conexão (QR Code na Evolution) ou revalida credenciais (API oficial).
     */
    public function connect(): JsonResponse
    {
        $result = $this->whatsapp->connect();

        return response()->json([
            'provider'  => WhatsappSetting::current()->provider,
            'connected' => $result['connected'],
            'detail'    => $result['detail'],
            'qrCode'    => $result['qrCode'] ?? null,
        ]);
    }

    /**
     * Configuração atual (admin). O token da API oficial nunca é devolvido em
     * texto puro — apenas mascarado, para a tela poder mostrar "já configurado".
     */
    public function settings(): JsonResponse
    {
        $settings = WhatsappSetting::current();

        return response()->json([
            'provider'              => $settings->provider,
            'cloud_phone_number_id' => $settings->cloud_phone_number_id,
            'cloud_waba_id'         => $settings->cloud_waba_id,
            'cloud_token_set'       => !empty($settings->cloud_token),
            'cloud_token_masked'    => Masks::last4($settings->cloud_token),
        ]);
    }

    /**
     * Atualiza o provider ativo e as credenciais da API oficial (admin).
     * A Evolution API usa apenas a URL e a Key do .env e o nome da instância
     * é gerenciado pela aplicação — nenhum dos dois é editável aqui.
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'provider'               => 'required|in:evolution,official',
            'cloud_token'            => 'nullable|string',
            'cloud_phone_number_id'  => 'nullable|string|max:255',
            'cloud_waba_id'          => 'nullable|string|max:255',
        ]);

        $settings = WhatsappSetting::current();

        $settings->provider              = $data['provider'];
        $settings->cloud_phone_number_id = $data['cloud_phone_number_id'] ?? null;
        $settings->cloud_waba_id         = $data['cloud_waba_id'] ?? null;

        // Só sobrescreve o token se um novo valor foi enviado — evita que o
        // usuário precise redigitar o token toda vez que só quer trocar outro campo.
        if (!empty($data['cloud_token'])) {
            $settings->cloud_token = $data['cloud_token'];
        }

        $settings->save();

        return response()->json([
            'provider'              => $settings->provider,
            'cloud_phone_number_id' => $settings->cloud_phone_number_id,
            'cloud_waba_id'         => $settings->cloud_waba_id,
            'cloud_token_set'       => !empty($settings->cloud_token),
            'cloud_token_masked'    => Masks::last4($settings->cloud_token),
        ]);
    }
}
