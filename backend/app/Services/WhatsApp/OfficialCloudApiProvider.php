<?php

namespace App\Services\WhatsApp;

use App\Models\WhatsappSetting;
use Illuminate\Support\Facades\Http;

class OfficialCloudApiProvider implements WhatsAppProviderInterface
{
    private string $apiVersion = 'v20.0';
    private string $token;
    private string $phoneNumberId;
    private bool   $enabled;

    public function __construct()
    {
        $settings = WhatsappSetting::current();

        $this->token         = $settings->cloud_token ?? '';
        $this->phoneNumberId = $settings->cloud_phone_number_id ?? '';
        $this->enabled       = !empty($this->token) && !empty($this->phoneNumberId);
    }

    public function isEnabled(): bool
    {
        return $this->enabled;
    }

    public function sendText(string $phone, string $message): bool
    {
        if (!$this->enabled) return false;

        $response = Http::timeout(15)
            ->withToken($this->token)
            ->post("https://graph.facebook.com/{$this->apiVersion}/{$this->phoneNumberId}/messages", [
                'messaging_product' => 'whatsapp',
                'to'                => $this->formatPhone($phone),
                'type'              => 'text',
                'text'              => ['body' => $message],
            ]);

        return $response->successful();
    }

    public function sendDocument(string $phone, string $base64Pdf, string $filename, string $caption = ''): bool
    {
        if (!$this->enabled) return false;

        $mediaId = $this->uploadMedia($base64Pdf, $filename);
        if (!$mediaId) return false;

        $response = Http::timeout(30)
            ->withToken($this->token)
            ->post("https://graph.facebook.com/{$this->apiVersion}/{$this->phoneNumberId}/messages", [
                'messaging_product' => 'whatsapp',
                'to'                => $this->formatPhone($phone),
                'type'              => 'document',
                'document'          => [
                    'id'       => $mediaId,
                    'filename' => $filename,
                    'caption'  => $caption,
                ],
            ]);

        return $response->successful();
    }

    public function connectionStatus(): array
    {
        if (!$this->enabled) {
            return [
                'connected' => false,
                'detail'    => 'WhatsApp Cloud API não configurada. Preencha o token e o Phone Number ID na tela de Integrações.',
                'meta'      => [],
            ];
        }

        try {
            $response = Http::timeout(10)
                ->withToken($this->token)
                ->get("https://graph.facebook.com/{$this->apiVersion}/{$this->phoneNumberId}", [
                    'fields' => 'display_phone_number,verified_name',
                ]);

            if (!$response->successful()) {
                $error = $response->json('error.message') ?? 'erro desconhecido';
                return [
                    'connected' => false,
                    'detail'    => "Falha ao validar credenciais na Meta Graph API: {$error}",
                    'meta'      => [],
                ];
            }

            $verifiedName = $response->json('verified_name');
            $displayPhone = $response->json('display_phone_number');

            return [
                'connected' => true,
                'detail'    => "Conectado como \"{$verifiedName}\" (" . $this->maskPhone($displayPhone) . ').',
                'meta'      => ['verified_name' => $verifiedName],
            ];
        } catch (\Throwable $e) {
            return [
                'connected' => false,
                'detail'    => 'Erro ao consultar a Meta Graph API: ' . $e->getMessage(),
                'meta'      => [],
            ];
        }
    }

    public function connect(): array
    {
        // API oficial não usa pareamento por QR — "conectar" revalida token + phone number id.
        return $this->connectionStatus() + ['qrCode' => null];
    }

    public function disconnect(): array
    {
        // Não existe "sessão" na API oficial — é um token de longa duração.
        // Desconectar aqui significa apagar as credenciais salvas.
        $settings = WhatsappSetting::current();
        $settings->cloud_token           = null;
        $settings->cloud_phone_number_id = null;
        $settings->cloud_waba_id         = null;
        $settings->save();

        return [
            'disconnected' => true,
            'detail'       => 'Credenciais removidas. Configure o Access Token e o Phone Number ID novamente para reconectar.',
        ];
    }

    private function uploadMedia(string $base64Pdf, string $filename): ?string
    {
        $binary = base64_decode($base64Pdf);

        $response = Http::timeout(30)
            ->withToken($this->token)
            ->attach('file', $binary, $filename, ['Content-Type' => 'application/pdf'])
            ->post("https://graph.facebook.com/{$this->apiVersion}/{$this->phoneNumberId}/media", [
                'messaging_product' => 'whatsapp',
                'type'              => 'application/pdf',
            ]);

        return $response->successful() ? $response->json('id') : null;
    }

    /**
     * Formata o número para o padrão E.164 sem "+" (somente dígitos + código do país).
     */
    private function formatPhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);

        if (strlen($digits) <= 11) {
            $digits = '55' . $digits;
        }

        return $digits;
    }

    private function maskPhone(?string $phone): string
    {
        if (!$phone) return '';

        $digits = preg_replace('/\D/', '', $phone);
        $len    = strlen($digits);

        if ($len <= 4) return $digits;

        return str_repeat('*', $len - 4) . substr($digits, -4);
    }
}
