<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class GeminiService
{
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

    private function buildPrompt(array $data): string
    {
        $name     = $data['name'];
        $score    = $data['score'];
        $phone    = $data['phone'];
        $answers  = $data['answers'] ?? [];
        $questions = $data['questions'] ?? [];

        $level = match (true) {
            $score >= 75 => 'Maturidade Avançada',
            $score >= 50 => 'Em Transição',
            $score >= 25 => 'Maturidade Inicial',
            default      => 'Diagnóstico Crítico',
        };

        // Monta resumo das respostas
        $answersText = '';
        foreach ($questions as $i => $q) {
            $pts = $answers[$i] ?? 0;
            $selectedOption = '';
            foreach (($q['options'] ?? []) as $opt) {
                if ((int)$opt['points'] === (int)$pts) {
                    $selectedOption = $opt['label'];
                    break;
                }
            }
            $answersText .= "- {$q['category']}: {$selectedOption} ({$pts} pts)\n";
        }

        return <<<PROMPT
Você é um especialista em estratégia comercial da G4 Educação. 
Gere um relatório de diagnóstico comercial PERSONALIZADO e PROFISSIONAL em português brasileiro para a empresa do lead abaixo.

DADOS DO LEAD:
- Nome: {$name}
- Score geral: {$score}/100
- Nível de maturidade: {$level}

RESPOSTAS DO DIAGNÓSTICO:
{$answersText}

INSTRUÇÕES:
- Escreva em HTML simples (use apenas: h1, h2, h3, p, ul, li, strong, em, div com class)
- Use as classes: "section", "highlight", "warning", "success", "tip"
- Seja ESPECÍFICO e cite as respostas do lead
- Estrutura obrigatória:
  1. Saudação personalizada com o nome
  2. Resumo do diagnóstico (score e nível)
  3. Pontos fortes identificados (baseado nas respostas com maior pontuação)
  4. Principais gargalos (baseado nas respostas com menor pontuação)  
  5. Plano de ação: 3 recomendações práticas e específicas
  6. Próximos passos com a G4
- Tom: profissional, direto, motivador
- NÃO inclua <!DOCTYPE>, <html>, <head>, <body> ou estilos CSS inline
- Máximo 600 palavras
PROMPT;
    }
}
