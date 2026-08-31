<?php

namespace App\Services\WhatsApp;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EvolutionProvider implements WhatsAppProviderInterface
{
    private string $url;
    private string $apiKey;
    private string $instance;
    private bool   $enabled;

    public function __construct()
    {
        $this->url      = rtrim(config('services.evolution.url', ''), '/');
        $this->apiKey   = config('services.evolution.key', '');
        // Nome da instância gerenciado pela aplicação — não é editável pelo admin.
        $this->instance = config('services.evolution.default_instance', 'g4');

        $this->enabled = !empty($this->url) && !empty($this->apiKey);
    }

    public function isEnabled(): bool
    {
        return $this->enabled;
    }

    public function sendText(string $phone, string $message): bool
    {
        if (!$this->enabled) return false;

        $response = Http::timeout(15)
            ->withHeaders(['apikey' => $this->apiKey])
            ->post("{$this->url}/message/sendText/{$this->instance}", [
                'number' => $this->formatPhone($phone),
                'text'   => $message,
            ]);

        return $response->successful();
    }

    public function sendDocument(string $phone, string $base64Pdf, string $filename, string $caption = ''): bool
    {
        if (!$this->enabled) return false;

        $response = Http::timeout(30)
            ->withHeaders(['apikey' => $this->apiKey])
            ->post("{$this->url}/message/sendMedia/{$this->instance}", [
                'number'    => $this->formatPhone($phone),
                'mediatype' => 'document',
                'mimetype'  => 'application/pdf',
                'caption'   => $caption,
                'media'     => 'data:application/pdf;base64,' . $base64Pdf,
                'fileName'  => $filename,
            ]);

        return $response->successful();
    }

    public function connectionStatus(): array
    {
        if (!$this->enabled) {
            return [
                'connected' => false,
                'detail'    => 'Evolution API não configurada (verifique EVOLUTION_API_URL e EVOLUTION_API_KEY no .env).',
                'meta'      => [],
            ];
        }

        try {
            $response = Http::timeout(10)
                ->withHeaders(['apikey' => $this->apiKey])
                ->get("{$this->url}/instance/connectionState/{$this->instance}");

            if ($response->status() === 404) {
                return [
                    'connected' => false,
                    'detail'    => 'Instância ainda não criada. Clique em "Conectar" para gerar o QR Code.',
                    'meta'      => ['exists' => false],
                ];
            }

            if (!$response->successful()) {
                return [
                    'connected' => false,
                    'detail'    => 'Não foi possível consultar o status da instância na Evolution API.',
                    'meta'      => [],
                ];
            }

            $state     = $response->json('instance.state') ?? $response->json('state');
            $connected = $state === 'open';

            return [
                'connected' => $connected,
                'detail'    => $connected
                    ? 'WhatsApp conectado.'
                    : 'Instância criada, mas não pareada (status: ' . ($state ?? 'desconhecido') . '). Clique em "Conectar" para gerar o QR Code.',
                'meta'      => ['state' => $state, 'exists' => true],
            ];
        } catch (\Throwable $e) {
            return [
                'connected' => false,
                'detail'    => 'Erro ao consultar a Evolution API: ' . $e->getMessage(),
                'meta'      => [],
            ];
        }
    }

    public function connect(): array
    {
        if (!$this->enabled) {
            return [
                'connected' => false,
                'detail'    => 'Evolution API não configurada.',
                'qrCode'    => null,
            ];
        }

        try {
            // Já pareada? Não há o que fazer além de confirmar o status.
            $current = $this->connectionStatus();
            if ($current['connected']) {
                return $current + ['qrCode' => null];
            }

            // Instância ainda não existe nesta Evolution API — cria antes de pedir o QR.
            $justCreated = false;
            if (($current['meta']['exists'] ?? true) === false) {
                $created     = $this->createInstance();
                $justCreated = true;

                if ($created !== null) {
                    return [
                        'connected' => false,
                        'detail'    => 'Escaneie o QR Code no WhatsApp para conectar.',
                        'qrCode'    => $created,
                    ];
                }
                // A Evolution API pode criar a instância sem devolver o QR já na
                // resposta de criação (varia por versão) — cai para fetchQrCode()
                // abaixo, com retry, em vez de assumir falha.
            }

            // Logo após criar a instância, o socket (Baileys) pode levar um
            // instante pra ficar pronto — tenta algumas vezes antes de desistir.
            $qrBase64 = $justCreated
                ? $this->fetchQrCodeWithRetry()
                : $this->fetchQrCode();

            if (!empty($qrBase64)) {
                return [
                    'connected' => false,
                    'detail'    => 'Escaneie o QR Code no WhatsApp para conectar.',
                    'qrCode'    => $qrBase64,
                ];
            }

            // Sem QR retornado — provavelmente já está pareada.
            return $this->connectionStatus() + ['qrCode' => null];
        } catch (\Throwable $e) {
            return [
                'connected' => false,
                'detail'    => 'Erro ao conectar: ' . $e->getMessage(),
                'qrCode'    => null,
            ];
        }
    }

    /**
     * Cria a instância na Evolution API. Retorna o QR Code (base64) já embutido
     * na resposta da criação, quando disponível, ou null caso precise ser
     * buscado separadamente via fetchQrCode().
     */
    private function createInstance(): ?string
    {
        $response = Http::timeout(20)
            ->withHeaders(['apikey' => $this->apiKey])
            ->post("{$this->url}/instance/create", [
                'instanceName' => $this->instance,
                'qrcode'       => true,
                'integration'  => 'WHATSAPP-BAILEYS',
            ]);

        if (!$response->successful()) {
            Log::warning('Evolution API: falha ao criar instância', [
                'instance' => $this->instance,
                'status'   => $response->status(),
                'body'     => $response->body(),
            ]);
            return null;
        }

        return $response->json('qrcode.base64') ?? $response->json('qrCode.base64');
    }

    /**
     * Busca o QR Code de uma instância já existente. Retorna null (sem
     * exceção) se a Evolution API responder com erro — quem chama decide
     * se tenta de novo (ver fetchQrCodeWithRetry()).
     */
    private function fetchQrCode(): ?string
    {
        $response = Http::timeout(15)
            ->withHeaders(['apikey' => $this->apiKey])
            ->get("{$this->url}/instance/connect/{$this->instance}");

        if (!$response->successful()) {
            Log::warning('Evolution API: falha ao buscar QR Code', [
                'instance' => $this->instance,
                'status'   => $response->status(),
                'body'     => $response->body(),
            ]);
            return null;
        }

        return $response->json('base64') ?? $response->json('qrcode.base64');
    }

    /**
     * Tenta buscar o QR Code algumas vezes com um pequeno intervalo — logo
     * após criar a instância, o socket da Evolution API pode levar um
     * instante para ficar pronto para gerar o QR (visto em produção: a
     * primeira tentativa imediatamente após /instance/create pode falhar
     * mesmo com a instância já criada com sucesso).
     */
    private function fetchQrCodeWithRetry(int $attempts = 3, int $delayMs = 800): ?string
    {
        for ($i = 1; $i <= $attempts; $i++) {
            $qr = $this->fetchQrCode();
            if (!empty($qr)) {
                return $qr;
            }
            if ($i < $attempts) {
                usleep($delayMs * 1000);
            }
        }

        return null;
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
