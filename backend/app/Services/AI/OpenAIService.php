<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;

class OpenAIService implements AIReportProviderInterface
{
    use PromptBuilder;

    private string $apiKey;
    private string $model;

    public function __construct()
    {
        $this->apiKey = config('services.openai.key');
        $this->model  = config('services.openai.model', 'gpt-4o-mini');
    }

    /**
     * Gera o relatório de diagnóstico comercial em HTML.
     */
    public function generateReport(array $data): string
    {
        $prompt = $this->buildPrompt($data);

        $response = Http::timeout(60)
            ->withToken($this->apiKey)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model'       => $this->model,
                'messages'    => [
                    ['role' => 'user', 'content' => $prompt],
                ],
                'temperature' => 0.7,
                'max_tokens'  => 2048,
            ]);

        if (!$response->successful()) {
            throw new \Exception('Erro ao chamar OpenAI: ' . $response->body());
        }

        $text = $response->json('choices.0.message.content') ?? '';

        if (empty($text)) {
            throw new \Exception('OpenAI retornou resposta vazia.');
        }

        return $text;
    }
}
