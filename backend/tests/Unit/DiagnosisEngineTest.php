<?php

namespace Tests\Unit;

use App\Services\DiagnosisEngine;
use PHPUnit\Framework\TestCase;

class DiagnosisEngineTest extends TestCase
{
    private DiagnosisEngine $engine;

    protected function setUp(): void
    {
        parent::setUp();
        $this->engine = new DiagnosisEngine();
    }

    /** Monta uma resposta pontuada para um dos 5 eixos fixos (perguntas 3-7). */
    private function scored(string $axis, int $points): array
    {
        return [
            'category_slug' => $axis,
            'type'          => 'escolha_unica',
            'scored'        => true,
            'points'        => $points,
            'value'         => "opção com {$points} pts",
            'other_text'    => null,
        ];
    }

    /** Monta a resposta da pergunta 8 (gargalo autodeclarado, múltipla escolha + Outra). */
    private function bottleneckAnswer(array $selectedLabels, ?string $otherText = null): array
    {
        return [
            'category_slug' => 'gargalo_autodeclarado',
            'type'          => 'multipla_com_outra',
            'scored'        => false,
            'points'        => null,
            'value'         => $selectedLabels,
            'other_text'    => $otherText,
        ];
    }

    private function allAxesEqual(int $points): array
    {
        return [
            $this->scored('geracao_demanda', $points),
            $this->scored('estrutura_comercial', $points),
            $this->scored('controle_custo', $points),
            $this->scored('atendimento_conversao', $points),
            $this->scored('previsibilidade', $points),
        ];
    }

    public function test_score_zero_e_nivel_1(): void
    {
        $result = $this->engine->compute($this->allAxesEqual(0));
        $this->assertSame(0, $result['score']);
        $this->assertSame(1, $result['level']);
        $this->assertSame('Dependente de Indicação', $result['level_label']);
    }

    public function test_faixa_de_corte_24_fica_no_nivel_1_e_25_sobe_para_nivel_2(): void
    {
        $abaixo = $this->engine->compute($this->allAxesEqual(24));
        $noCorte = $this->engine->compute($this->allAxesEqual(25));

        $this->assertSame(1, $abaixo['level']);
        $this->assertSame(2, $noCorte['level']);
    }

    public function test_faixa_de_corte_49_e_50(): void
    {
        $this->assertSame(2, $this->engine->compute($this->allAxesEqual(49))['level']);
        $this->assertSame(3, $this->engine->compute($this->allAxesEqual(50))['level']);
    }

    public function test_faixa_de_corte_74_e_75(): void
    {
        $this->assertSame(3, $this->engine->compute($this->allAxesEqual(74))['level']);
        $this->assertSame(4, $this->engine->compute($this->allAxesEqual(75))['level']);
    }

    public function test_score_100_e_nivel_4_previsivel(): void
    {
        $result = $this->engine->compute($this->allAxesEqual(100));
        $this->assertSame(100, $result['score']);
        $this->assertSame(4, $result['level']);
        $this->assertSame('Previsível', $result['level_label']);
    }

    public function test_gargalo_escolhe_o_eixo_de_menor_pontuacao_entre_as_opcoes_marcadas(): void
    {
        $answers = [
            $this->scored('geracao_demanda', 80),
            $this->scored('estrutura_comercial', 50),
            $this->scored('controle_custo', 50),
            $this->scored('atendimento_conversao', 20), // o mais fraco dos dois marcados
            $this->scored('previsibilidade', 50),
            $this->bottleneckAnswer([
                'Tenho dificuldade para gerar novos clientes',   // -> geracao_demanda (80)
                'Recebo contatos, mas poucos se tornam clientes', // -> atendimento_conversao (20)
            ]),
        ];

        $result = $this->engine->compute($answers);

        $this->assertSame('atendimento_conversao', $result['bottleneck_category']);
    }

    public function test_gargalo_cai_no_fallback_do_eixo_mais_fraco_quando_so_outra_e_marcada(): void
    {
        $answers = [
            $this->scored('geracao_demanda', 80),
            $this->scored('estrutura_comercial', 50),
            $this->scored('controle_custo', 10), // o mais fraco geral
            $this->scored('atendimento_conversao', 50),
            $this->scored('previsibilidade', 50),
            $this->bottleneckAnswer(['Outra'], 'Não sei nem por onde começar'),
        ];

        $result = $this->engine->compute($answers);

        $this->assertSame('controle_custo', $result['bottleneck_category']);
    }

    public function test_pontos_fortes_e_pontos_de_atencao_nao_repetem_o_gargalo(): void
    {
        $answers = [
            $this->scored('geracao_demanda', 100),
            $this->scored('estrutura_comercial', 100),
            $this->scored('controle_custo', 33),
            $this->scored('atendimento_conversao', 0), // gargalo
            $this->scored('previsibilidade', 66),
            $this->bottleneckAnswer(['Recebo contatos, mas poucos se tornam clientes']),
        ];

        $result = $this->engine->compute($answers);

        $this->assertSame('atendimento_conversao', $result['bottleneck_category']);
        $this->assertContains('Geração de Demanda', $result['strengths']);
        $this->assertContains('Estrutura Comercial', $result['strengths']);
        $this->assertNotContains('Atendimento e Conversão', $result['attention_points']);
        $this->assertContains('Controle de Custo (CAC)', $result['attention_points']);
    }

    public function test_perguntas_nao_pontuadas_sao_ignoradas_no_score(): void
    {
        $answers = $this->allAxesEqual(50);
        $answers[] = [
            'category_slug' => 'faturamento',
            'type'          => 'escolha_unica',
            'scored'        => false,
            'points'        => null,
            'value'         => 'Até R$ 10 mil',
            'other_text'    => null,
        ];

        $result = $this->engine->compute($answers);

        $this->assertSame(50, $result['score']);
    }

    public function test_prioridades_incluem_a_do_nivel_e_a_do_gargalo(): void
    {
        $answers = [
            $this->scored('geracao_demanda', 0), // gargalo
            $this->scored('estrutura_comercial', 30),
            $this->scored('controle_custo', 30),
            $this->scored('atendimento_conversao', 30),
            $this->scored('previsibilidade', 30),
            $this->bottleneckAnswer(['Tenho dificuldade para gerar novos clientes']),
        ];

        $result = $this->engine->compute($answers);

        $this->assertSame('geracao_demanda', $result['bottleneck_category']);
        $this->assertGreaterThanOrEqual(2, count($result['priorities']));
        $this->assertLessThanOrEqual(3, count($result['priorities']));
        $this->assertContains('Estruturar um canal ativo de aquisição (tráfego/anúncios), não só indicação', $result['priorities']);
    }

    public function test_sem_respostas_pontuadas_devolve_score_zero_e_gargalo_nulo(): void
    {
        $result = $this->engine->compute([]);

        $this->assertSame(0, $result['score']);
        $this->assertSame(1, $result['level']);
        $this->assertNull($result['bottleneck_category']);
    }
}
