<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;

class GeminiService implements AIReportProviderInterface
{
    use PromptBuilder;

    private string $apiKey;
    private string $model = 'gemini-2.0-flash';

    public function __construct()
    {
        $this->apiKey = config('services.gemini.key');
    }

    /**
     * Gera o relatório de diagnóstico comercial em HTML.
     */
    public function generateReport(array $data): string
    {
        $prompt = $this->buildPrompt($data);

        $response = Http::timeout(60)->post(
            "https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:generateContent?key={$this->apiKey}",
            [
                'contents' => [
                    ['parts' => [['text' => $prompt]]]
                ],
                'generationConfig' => [
                    'temperature'     => 0.7,
                    'maxOutputTokens' => 2048,
                ],
            ]
        );

        if (!$response->successful()) {
            throw new \Exception('Erro ao chamar Gemini: ' . $response->body());
        }

        $text = $response->json('candidates.0.content.parts.0.text') ?? '';

        if (empty($text)) {
            throw new \Exception('Gemini retornou resposta vazia.');
        }

        return $text;
    }
}
