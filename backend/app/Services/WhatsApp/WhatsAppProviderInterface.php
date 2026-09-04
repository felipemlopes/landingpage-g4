<?php

namespace App\Services\WhatsApp;

interface WhatsAppProviderInterface
{
    public function isEnabled(): bool;

    /**
     * Envia mensagem de texto.
     */
    public function sendText(string $phone, string $message): bool;

    /**
     * Envia um PDF como documento.
     */
    public function sendDocument(string $phone, string $base64Pdf, string $filename, string $caption = ''): bool;

    /**
     * Status de conexão do provider, sem expor segredos.
     * ['connected' => bool, 'detail' => string, 'meta' => array]
     */
    public function connectionStatus(): array;

    /**
     * Inicia/atualiza a conexão (ex.: gera QR Code na Evolution).
     * Providers sem pareamento (ex.: API oficial) apenas revalidam as credenciais.
     * ['connected' => bool, 'detail' => string, 'qrCode' => ?string]
     */
    public function connect(): array;

    /**
     * Encerra a conexão/credenciais ativas.
     * Evolution: logout da instância (mantém a instância criada, exige novo QR).
     * API oficial: apaga o token e os IDs salvos.
     * ['disconnected' => bool, 'detail' => string]
     */
    public function disconnect(): array;
}
