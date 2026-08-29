<?php

namespace App\Http\Controllers;

use App\Models\Question;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuestionController extends Controller
{
    /**
     * Retorna todas as perguntas ativas ordenadas (rota pública — quiz).
     */
    public function index(): JsonResponse
    {
        $questions = Question::where('active', true)
            ->orderBy('order')
            ->get();

        return response()->json($questions);
    }

    /**
     * Retorna todas as perguntas incluindo inativas (autenticado — admin).
     */
    public function adminIndex(): JsonResponse
    {
        $questions = Question::orderBy('order')->get();

        return response()->json($questions);
    }

    /**
     * Cria nova pergunta (autenticado — admin).
     */
    public function store(Request $request): JsonResponse
    {
        $type   = $request->input('type', 'escolha_unica');
        $scored = $request->boolean('scored', true);
        $needsOptions = in_array($type, ['escolha_unica', 'multipla_com_outra'], true);

        $data = $request->validate([
            'category'      => 'required|string|max:255',
            'category_slug' => 'nullable|string|max:100',
            'text'          => 'required|string',
            'type'          => 'nullable|in:texto_livre,escolha_unica,multipla_com_outra',
            'scored'        => 'nullable|boolean',
            'allow_other'   => 'nullable|boolean',
            'options'       => ($needsOptions ? 'required' : 'nullable') . '|array' . ($needsOptions ? '|min:2' : ''),
            'options.*.label'  => 'required_with:options|string',
            'options.*.points' => ($scored ? 'required_with:options' : 'nullable') . '|integer|min:0|max:100',
            'order'    => 'nullable|integer',
            'active'   => 'nullable|boolean',
        ]);

        $data['options'] = $data['options'] ?? [];
        $data['order']   = $data['order']   ?? (Question::max('order') + 1);
        $data['active']  = $data['active']  ?? true;

        $question = Question::create($data);

        return response()->json($question, 201);
    }

    /**
     * Atualiza uma pergunta (autenticado — admin).
     */
    public function update(Request $request, Question $question): JsonResponse
    {
        $type   = $request->input('type', $question->type);
        $scored = $request->has('scored') ? $request->boolean('scored') : $question->scored;
        $needsOptions = in_array($type, ['escolha_unica', 'multipla_com_outra'], true);

        $data = $request->validate([
            'category'      => 'sometimes|required|string|max:255',
            'category_slug' => 'nullable|string|max:100',
            'text'          => 'sometimes|required|string',
            'type'          => 'nullable|in:texto_livre,escolha_unica,multipla_com_outra',
            'scored'        => 'nullable|boolean',
            'allow_other'   => 'nullable|boolean',
            'options'       => ($needsOptions ? 'sometimes|required' : 'nullable') . '|array' . ($needsOptions ? '|min:2' : ''),
            'options.*.label'  => 'required_with:options|string',
            'options.*.points' => ($scored ? 'required_with:options' : 'nullable') . '|integer|min:0|max:100',
            'order'    => 'nullable|integer',
            'active'   => 'nullable|boolean',
        ]);

        $question->update($data);

        return response()->json($question);
    }

    /**
     * Remove uma pergunta (autenticado — admin).
     */
    public function destroy(Question $question): JsonResponse
    {
        $question->delete();

        return response()->json(['message' => 'Pergunta removida.']);
    }

    /**
     * Reordena as perguntas (autenticado — admin).
     * Body: [{ id: 1, order: 0 }, { id: 2, order: 1 }, ...]
     */
    public function reorder(Request $request): JsonResponse
    {
        $request->validate([
            'items'         => 'required|array',
            'items.*.id'    => 'required|integer|exists:questions,id',
            'items.*.order' => 'required|integer|min:0',
        ]);

        foreach ($request->items as $item) {
            Question::where('id', $item['id'])->update(['order' => $item['order']]);
        }

        return response()->json(['message' => 'Ordem atualizada.']);
    }

    /**
     * Restaura perguntas padrão (autenticado — admin).
     */
    public function resetDefaults(): JsonResponse
    {
        Question::truncate();
        $this->seedDefaults();

        return response()->json(['message' => 'Perguntas restauradas para o padrão.']);
    }

    /**
     * As 11 perguntas do "Diagnóstico de Maturidade e Crescimento do Escritório".
     * Só as perguntas 3-7 (`scored: true`) compõem o score de maturidade — ver
     * `App\Services\DiagnosisEngine`. As perguntas de `category_slug` igual a
     * `intencao_compra`/`fit_investimento` (10 e 11) são exibidas pelo frontend
     * na tela de qualificação, depois do resultado — não durante o quiz inicial.
     */
    private function seedDefaults(): void
    {
        $defaults = [
            // 1 — segmentação, texto livre, não pontua
            [
                'category' => 'Área de Atuação', 'category_slug' => 'area_atuacao',
                'text' => 'Qual é a principal área de atuação do seu escritório?',
                'type' => 'texto_livre', 'scored' => false, 'options' => [],
            ],
            // 2 — segmentação, escolha única, não pontua
            [
                'category' => 'Faturamento', 'category_slug' => 'faturamento',
                'text' => 'Qual é o faturamento médio mensal atual do seu escritório?',
                'type' => 'escolha_unica', 'scored' => false, 'options' => [
                    ['label' => 'Até R$ 10 mil', 'points' => null],
                    ['label' => 'De R$ 11 mil a R$ 20 mil', 'points' => null],
                    ['label' => 'De R$ 21 mil a R$ 50 mil', 'points' => null],
                    ['label' => 'De R$ 51 mil a R$ 100 mil', 'points' => null],
                    ['label' => 'Acima de R$ 100 mil', 'points' => null],
                ],
            ],
            // 3 — eixo: estrutura_comercial (pontua)
            [
                'category' => 'Estrutura Comercial', 'category_slug' => 'estrutura_comercial',
                'text' => 'Hoje, quem é responsável pela captação e atendimento de novos clientes?',
                'type' => 'escolha_unica', 'scored' => true, 'options' => [
                    ['label' => 'Somente eu, como advogado(a) ou sócio(a)', 'points' => 0],
                    ['label' => 'Uma ou duas pessoas me ajudam no atendimento', 'points' => 33],
                    ['label' => 'Tenho uma equipe comercial/atendimento', 'points' => 66],
                    ['label' => 'Tenho uma equipe estruturada com responsáveis por captação, atendimento e fechamento', 'points' => 100],
                ],
            ],
            // 4 — eixo: geracao_demanda (pontua)
            [
                'category' => 'Geração de Demanda', 'category_slug' => 'geracao_demanda',
                'text' => 'Como novos clientes chegam ao seu escritório atualmente?',
                'type' => 'escolha_unica', 'scored' => true, 'options' => [
                    ['label' => 'Principalmente por indicação e boca a boca, com volume instável', 'points' => 0],
                    ['label' => 'Já fazemos algumas ações de marketing ou anúncios, mas os resultados oscilam muito', 'points' => 33],
                    ['label' => 'Temos tráfego e ações de marketing gerando oportunidades com certa frequência', 'points' => 66],
                    ['label' => 'Temos uma estratégia estruturada de aquisição e recebemos oportunidades de forma previsível', 'points' => 100],
                ],
            ],
            // 5 — eixo: controle_custo (pontua)
            [
                'category' => 'Controle de Custo', 'category_slug' => 'controle_custo',
                'text' => 'Você sabe quanto custa, em média, para gerar um novo contato interessado no seu escritório?',
                'type' => 'escolha_unica', 'scored' => true, 'options' => [
                    ['label' => 'Não faço ideia', 'points' => 0],
                    ['label' => 'Tenho apenas uma noção aproximada', 'points' => 33],
                    ['label' => 'Consigo acompanhar alguns números das campanhas', 'points' => 66],
                    ['label' => 'Sei exatamente quanto invisto, quantos leads gero e quanto custa cada oportunidade', 'points' => 100],
                ],
            ],
            // 6 — eixo: atendimento_conversao (pontua)
            [
                'category' => 'Atendimento e Conversão', 'category_slug' => 'atendimento_conversao',
                'text' => 'O escritório possui um processo estruturado para atender, qualificar e converter novos interessados em clientes?',
                'type' => 'escolha_unica', 'scored' => true, 'options' => [
                    ['label' => 'Muitos contatos ficam sem resposta ou são atendidos sem nenhum critério', 'points' => 0],
                    ['label' => 'Atendemos quando conseguimos, mas não temos um processo definido', 'points' => 33],
                    ['label' => 'Temos um processo básico de atendimento e triagem, mas ele não é aplicado sempre', 'points' => 66],
                    ['label' => 'Temos um processo estruturado de atendimento, qualificação e conversão, seguido pela equipe', 'points' => 100],
                ],
            ],
            // 7 — eixo: previsibilidade (pontua)
            [
                'category' => 'Previsibilidade', 'category_slug' => 'previsibilidade',
                'text' => 'Você consegue acompanhar os números do escritório e prever quanto pode faturar nos próximos meses?',
                'type' => 'escolha_unica', 'scored' => true, 'options' => [
                    ['label' => 'Não acompanho esses números de forma estruturada', 'points' => 0],
                    ['label' => 'Tenho algumas informações, mas só consigo entender o resultado depois que o mês termina', 'points' => 33],
                    ['label' => 'Acompanho parte do funil e consigo fazer uma estimativa', 'points' => 66],
                    ['label' => 'Acompanho leads, atendimentos, consultas, contratos e conversões, conseguindo prever o faturamento', 'points' => 100],
                ],
            ],
            // 8 — gargalo autodeclarado, múltipla escolha + Outra, não pontua (alimenta o gargalo)
            [
                'category' => 'Maior Dificuldade', 'category_slug' => 'gargalo_autodeclarado',
                'text' => 'Qual é a maior dificuldade do seu escritório hoje para crescer?',
                'type' => 'multipla_com_outra', 'scored' => false, 'allow_other' => true, 'options' => [
                    ['label' => 'Tenho dificuldade para gerar novos clientes', 'points' => null],
                    ['label' => 'Recebo contatos, mas poucos se tornam clientes', 'points' => null],
                    ['label' => 'Tenho dificuldade para organizar e acompanhar os interessados', 'points' => null],
                    ['label' => 'Invisto em marketing, mas não consigo entender o retorno', 'points' => null],
                    ['label' => 'Minha entrada de clientes depende muito de indicação', 'points' => null],
                    ['label' => 'Tenho demanda, mas não tenho estrutura para crescer', 'points' => null],
                    ['label' => 'Outra', 'points' => null],
                ],
            ],
            // 9 — personalização, escolha única, não pontua
            [
                'category' => 'Intenção de Descoberta', 'category_slug' => 'intencao_descoberta',
                'text' => 'O que você mais gostaria de descobrir ao final deste diagnóstico?',
                'type' => 'escolha_unica', 'scored' => false, 'options' => [
                    ['label' => 'Entender o nível atual de estrutura do meu escritório', 'points' => null],
                    ['label' => 'Identificar os principais gargalos que estão impedindo meu crescimento', 'points' => null],
                    ['label' => 'Descobrir quais áreas do escritório precisam de mais atenção', 'points' => null],
                    ['label' => 'Entender quais são os próximos passos para tornar meu crescimento mais previsível', 'points' => null],
                ],
            ],
            // 10 — qualificação comercial (pós-resultado), não pontua
            [
                'category' => 'Nível de Interesse', 'category_slug' => 'intencao_compra',
                'text' => 'Depois de identificar os principais pontos que podem melhorar o crescimento do seu escritório, qual é o seu nível de interesse em estruturar essas áreas?',
                'type' => 'escolha_unica', 'scored' => false, 'options' => [
                    ['label' => 'Neste momento, quero apenas entender melhor o cenário do meu escritório', 'points' => null],
                    ['label' => 'Tenho interesse em melhorar, mas ainda estou avaliando o momento', 'points' => null],
                    ['label' => 'Quero implementar melhorias e estou avaliando as melhores opções', 'points' => null],
                    ['label' => 'Quero começar a estruturar essas melhorias no meu escritório', 'points' => null],
                ],
            ],
            // 11 — qualificação comercial (pós-resultado), não pontua
            [
                'category' => 'Fit de Investimento', 'category_slug' => 'fit_investimento',
                'text' => 'Para escritórios que desejam implementar uma estrutura completa de captação e crescimento, o investimento inicial parte de aproximadamente R$ 2.500. Considerando o momento atual do seu escritório, como esse investimento se encaixa na sua realidade?',
                'type' => 'escolha_unica', 'scored' => false, 'options' => [
                    ['label' => 'Está dentro da realidade de investimento do escritório', 'points' => null],
                    ['label' => 'Consigo investir, mas preciso avaliar o momento', 'points' => null],
                    ['label' => 'Precisaria de uma condição de investimento diferente', 'points' => null],
                    ['label' => 'No momento, não tenho disponibilidade para esse investimento', 'points' => null],
                ],
            ],
        ];

        foreach ($defaults as $i => $q) {
            Question::create([
                'category'      => $q['category'],
                'category_slug' => $q['category_slug'],
                'text'          => $q['text'],
                'type'          => $q['type'],
                'scored'        => $q['scored'],
                'allow_other'   => $q['allow_other'] ?? false,
                'options'       => $q['options'],
                'order'         => $i,
                'active'        => true,
            ]);
        }
    }
}
