<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class WhatsAppService
{
    private string $url;
    private string $apiKey;
    private string $instance;
    private bool   $enabled;

    public function __construct()
    {
        $this->url      = rtrim(config('services.evolution.url', ''), '/');
        $this->apiKey   = config('services.evolution.key', '');
        $this->instance = config('services.evolution.instance', '');
        $this->enabled  = !empty($this->url) && !empty($this->apiKey) && !empty($this->instance);
    }

    public function isEnabled(): bool
    {
        return $this->enabled;
    }

    /**
     * Envia mensagem de texto.
     */
    public function sendText(string $phone, string $message): bool
    {
        if (!$this->enabled) return false;

        $number = $this->formatPhone($phone);

        $response = Http::timeout(15)
            ->withHeaders(['apikey' => $this->apiKey])
            ->post("{$this->url}/message/sendText/{$this->instance}", [
                'number'  => $number,
                'text'    => $message,
            ]);

        return $response->successful();
    }

    /**
     * Envia PDF como documento.
     */
    public function sendDocument(string $phone, string $base64Pdf, string $filename, string $caption = ''): bool
    {
        if (!$this->enabled) return false;

        $number = $this->formatPhone($phone);

        $response = Http::timeout(30)
            ->withHeaders(['apikey' => $this->apiKey])
            ->post("{$this->url}/message/sendMedia/{$this->instance}", [
                'number'   => $number,
                'mediatype' => 'document',
                'mimetype' => 'application/pdf',
                'caption'  => $caption,
                'media'    => 'data:application/pdf;base64,' . $base64Pdf,
                'fileName' => $filename,
            ]);

        return $response->successful();
    }

    /**
     * Formata o número para o padrão da Evolution API (somente dígitos + código do país).
     */
    private function formatPhone(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);

        // Adiciona 55 (Brasil) se não tiver código do país
        if (strlen($digits) <= 11) {
            $digits = '55' . $digits;
        }

        return $digits;
    }
}
