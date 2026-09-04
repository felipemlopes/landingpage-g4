<?php

namespace App\Services\AI;

use App\Models\AiPromptSetting;

trait PromptBuilder
{
    /**
     * Template padrão do prompt — usado quando o admin nunca configurou (ou
     * limpou) um template customizado em Integrações. Suporta as variáveis
     * {nome}, {pontuacao}, {nivel}, {respostas} e {marca}.
     */
    public const DEFAULT_PROMPT_TEMPLATE = <<<PROMPT
Você é um especialista em estratégia comercial da {marca}.
Gere um relatório de diagnóstico comercial PERSONALIZADO e PROFISSIONAL em português brasileiro para a empresa do lead abaixo.

DADOS DO LEAD:
- Nome: {nome}
- Score geral: {pontuacao}/100
- Nível de maturidade: {nivel}

RESPOSTAS DO DIAGNÓSTICO:
{respostas}

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
  6. Próximos passos com a {marca}
- Tom: profissional, direto, motivador
- NÃO inclua <!DOCTYPE>, <html>, <head>, <body> ou estilos CSS inline
- Máximo 600 palavras
PROMPT;

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

        // Fonte primária: banco (configurável pelo admin em Integrações).
        // Fallback: o template padrão embutido acima.
        $template = AiPromptSetting::current()->prompt_template ?: self::DEFAULT_PROMPT_TEMPLATE;

        return strtr($template, [
            '{nome}'      => $name,
            '{pontuacao}' => (string) $score,
            '{nivel}'     => $level,
            '{respostas}' => $answersText,
            '{marca}'     => config('app.name'),
        ]);
    }
}
