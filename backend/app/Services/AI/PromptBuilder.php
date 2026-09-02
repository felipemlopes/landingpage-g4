<?php

namespace App\Services\AI;

trait PromptBuilder
{
    private function buildPrompt(array $data): string
    {
        $name      = $data['name'];
        $score     = $data['score'];
        $answers   = $data['answers'] ?? [];
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

        $brand = config('app.name');

        return <<<PROMPT
Você é um especialista em estratégia comercial da {$brand}.
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
  6. Próximos passos com a {$brand}
- Tom: profissional, direto, motivador
- NÃO inclua <!DOCTYPE>, <html>, <head>, <body> ou estilos CSS inline
- Máximo 600 palavras
PROMPT;
    }
}
