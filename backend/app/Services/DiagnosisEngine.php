<?php

namespace App\Services;

/**
 * Calcula o diagnóstico de maturidade do escritório a partir das respostas do
 * quiz (perguntas 3-8 do briefing). Função pura — não toca no banco — para ser
 * facilmente testável e reutilizável (ex.: enriquecer o prompt da IA no futuro).
 *
 * Contrato de entrada (`$answers`), um item por pergunta respondida:
 * [
 *   'category_slug' => string|null,  // eixo fixo (ver AXIS_LABELS) ou null p/ perguntas fora do score
 *   'type'          => string,       // 'texto_livre' | 'escolha_unica' | 'multipla_com_outra'
 *   'scored'        => bool,         // se essa pergunta soma pontos ao score de maturidade
 *   'points'        => int|null,     // pontos da opção escolhida (só relevante quando scored=true)
 *   'value'         => string|array, // texto (texto_livre/escolha_unica) ou lista de labels marcados (multipla_com_outra)
 *   'other_text'    => string|null,  // texto livre de "Outra", quando marcada
 * ]
 *
 * Ver `.kiro/specs/diagnostico-maturidade-escritorio/design.md` (seções 3.1-3.4).
 */
class DiagnosisEngine
{
    /** Eixos fixos que compõem o score de maturidade, na ordem do briefing. */
    private const AXES = [
        'geracao_demanda',
        'estrutura_comercial',
        'controle_custo',
        'atendimento_conversao',
        'previsibilidade',
    ];

    /** Rótulo de exibição de cada eixo (admin, XLSX, resultado). */
    public const AXIS_LABELS = [
        'geracao_demanda'       => 'Geração de Demanda',
        'estrutura_comercial'   => 'Estrutura Comercial',
        'controle_custo'        => 'Controle de Custo (CAC)',
        'atendimento_conversao' => 'Atendimento e Conversão',
        'previsibilidade'       => 'Previsibilidade e Gestão',
    ];

    /** category_slug da pergunta 8 (gargalo autodeclarado). */
    private const BOTTLENECK_QUESTION_SLUG = 'gargalo_autodeclarado';

    /** Mapeia o texto de cada opção da pergunta 8 para o eixo correspondente (design 3.3). */
    private const OPTION_AXIS_MAP = [
        'Tenho dificuldade para gerar novos clientes'                  => 'geracao_demanda',
        'Minha entrada de clientes depende muito de indicação'         => 'geracao_demanda',
        'Recebo contatos, mas poucos se tornam clientes'                => 'atendimento_conversao',
        'Tenho dificuldade para organizar e acompanhar os interessados' => 'atendimento_conversao',
        'Invisto em marketing, mas não consigo entender o retorno'     => 'controle_custo',
        'Tenho demanda, mas não tenho estrutura para crescer'          => 'estrutura_comercial',
    ];

    private const LEVEL_LABELS = [
        1 => 'Dependente de Indicação',
        2 => 'Em Estruturação',
        3 => 'Em Crescimento',
        4 => 'Previsível',
    ];

    private const NEXT_STAGE_COPY = [
        1 => 'Para sair da dependência de indicação, o próximo passo é estruturar um canal de aquisição próprio e um atendimento mínimo que não deixe contato sem resposta.',
        2 => 'Você já tem os primeiros processos. O próximo estágio é dar consistência: um funil de atendimento seguido sempre, não só quando dá tempo.',
        3 => 'Sua base é sólida. Para virar "previsível", falta amarrar os números — saber hoje quanto vai faturar no mês que vem.',
        4 => 'Você já tem um motor previsível. Aqui o foco passa a ser otimização contínua e escala sem perder qualidade.',
    ];

    private const PRIORITY_BY_LEVEL = [
        1 => 'Criar uma fonte de captação que não dependa de indicação',
        2 => 'Documentar um processo mínimo de atendimento e triagem',
        3 => 'Implementar acompanhamento semanal de funil e metas',
        4 => 'Revisar gargalos de escala (equipe, capacidade de atendimento)',
    ];

    private const PRIORITY_BY_AXIS = [
        'geracao_demanda'       => 'Estruturar um canal ativo de aquisição (tráfego/anúncios), não só indicação',
        'estrutura_comercial'   => 'Definir quem é responsável por cada etapa (captação, atendimento, fechamento)',
        'controle_custo'        => 'Passar a medir custo por lead e por contrato fechado',
        'atendimento_conversao' => 'Criar um processo de triagem e resposta rápida para todo novo contato',
        'previsibilidade'       => 'Implementar um painel simples de acompanhamento de leads → contratos',
    ];

    /**
     * @param array<int, array<string, mixed>> $answers
     * @return array{
     *   score:int, level:int, level_label:string, level_title:string,
     *   bottleneck_category:?string, strengths:string[], attention_points:string[],
     *   next_stage:string, priorities:string[]
     * }
     */
    public function compute(array $answers): array
    {
        $axisScores = $this->extractAxisScores($answers);
        $score      = $this->averageScore($axisScores);
        $level      = LevelClassifier::levelFor($score);
        $bottleneck = $this->bottleneckFor($answers, $axisScores);

        $strengths = $this->rankAxes($axisScores, exclude: [], min: 66, limit: 2, ascending: false);
        $attention = $this->rankAxes($axisScores, exclude: array_filter([$bottleneck]), min: null, limit: 2, ascending: true);

        return [
            'score'               => $score,
            'level'               => $level,
            'level_label'         => self::LEVEL_LABELS[$level],
            'level_title'         => "Nível {$level} — " . self::LEVEL_LABELS[$level],
            'bottleneck_category' => $bottleneck,
            'bottleneck_label'    => self::axisLabel($bottleneck),
            'strengths'           => $strengths,
            'attention_points'    => $attention,
            'next_stage'          => self::NEXT_STAGE_COPY[$level],
            'priorities'          => $this->priorities($level, $bottleneck, $attention),
        ];
    }

    public static function axisLabel(?string $slug): string
    {
        return self::AXIS_LABELS[$slug] ?? '—';
    }

    /** @return array<string, int> eixo => pontuação (0-100) */
    private function extractAxisScores(array $answers): array
    {
        $byAxis = [];
        foreach ($answers as $answer) {
            $slug = $answer['category_slug'] ?? null;
            if ($slug === null || !in_array($slug, self::AXES, true)) continue;
            if (empty($answer['scored']) || $answer['points'] === null) continue;

            $byAxis[$slug][] = (int) $answer['points'];
        }

        $axisScores = [];
        foreach ($byAxis as $slug => $points) {
            $axisScores[$slug] = (int) round(array_sum($points) / count($points));
        }

        return $axisScores;
    }

    private function averageScore(array $axisScores): int
    {
        if (empty($axisScores)) return 0;

        return (int) round(array_sum($axisScores) / count($axisScores));
    }

    private function bottleneckFor(array $answers, array $axisScores): ?string
    {
        $declared = null;
        foreach ($answers as $answer) {
            if (($answer['category_slug'] ?? null) === self::BOTTLENECK_QUESTION_SLUG) {
                $declared = $answer;
                break;
            }
        }

        if ($declared !== null) {
            $selected = is_array($declared['value'] ?? null) ? $declared['value'] : [$declared['value'] ?? null];
            $candidateAxes = [];
            foreach ($selected as $label) {
                $axis = self::OPTION_AXIS_MAP[$label] ?? null;
                if ($axis !== null && isset($axisScores[$axis])) {
                    $candidateAxes[] = $axis;
                }
            }

            if (!empty($candidateAxes)) {
                return $this->lowestAxis(array_intersect_key($axisScores, array_flip($candidateAxes)));
            }
        }

        // Fallback: só "Outra" foi marcada (ou pergunta não respondida) — usa o eixo mais fraco geral.
        return empty($axisScores) ? null : $this->lowestAxis($axisScores);
    }

    private function lowestAxis(array $axisScores): ?string
    {
        if (empty($axisScores)) return null;
        asort($axisScores);

        return array_key_first($axisScores);
    }

    /** @return string[] labels dos eixos (não os slugs) */
    private function rankAxes(array $axisScores, array $exclude, ?int $min, int $limit, bool $ascending): array
    {
        $filtered = array_filter(
            $axisScores,
            fn ($value, $slug) => !in_array($slug, $exclude, true) && ($min === null || $value >= $min),
            ARRAY_FILTER_USE_BOTH,
        );

        $ascending ? asort($filtered) : arsort($filtered);

        return array_map(
            fn ($slug) => self::axisLabel($slug),
            array_slice(array_keys($filtered), 0, $limit),
        );
    }

    /** @return string[] até 3 prioridades: 1 geral do nível + 1 do gargalo + 1 do ponto de atenção mais fraco (se distinto) */
    private function priorities(int $level, ?string $bottleneck, array $attentionLabels): array
    {
        $priorities = [self::PRIORITY_BY_LEVEL[$level]];

        if ($bottleneck !== null && isset(self::PRIORITY_BY_AXIS[$bottleneck])) {
            $priorities[] = self::PRIORITY_BY_AXIS[$bottleneck];
        }

        $bottleneckLabel = self::axisLabel($bottleneck);
        foreach ($attentionLabels as $label) {
            if ($label !== $bottleneckLabel && count($priorities) < 3) {
                $axisSlug = array_search($label, self::AXIS_LABELS, true);
                if ($axisSlug !== false && isset(self::PRIORITY_BY_AXIS[$axisSlug])) {
                    $priorities[] = self::PRIORITY_BY_AXIS[$axisSlug];
                }
                break;
            }
        }

        return $priorities;
    }
}
