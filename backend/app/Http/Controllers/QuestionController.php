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
        $data = $request->validate([
            'category' => 'required|string|max:255',
            'text'     => 'required|string',
            'options'  => 'required|array|min:2',
            'options.*.label'  => 'required|string',
            'options.*.points' => 'required|integer|min:0|max:100',
            'order'    => 'nullable|integer',
            'active'   => 'nullable|boolean',
        ]);

        $data['order']  = $data['order']  ?? (Question::max('order') + 1);
        $data['active'] = $data['active'] ?? true;

        $question = Question::create($data);

        return response()->json($question, 201);
    }

    /**
     * Atualiza uma pergunta (autenticado — admin).
     */
    public function update(Request $request, Question $question): JsonResponse
    {
        $data = $request->validate([
            'category' => 'sometimes|required|string|max:255',
            'text'     => 'sometimes|required|string',
            'options'  => 'sometimes|required|array|min:2',
            'options.*.label'  => 'required_with:options|string',
            'options.*.points' => 'required_with:options|integer|min:0|max:100',
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

    private function seedDefaults(): void
    {
        $defaults = [
            ['category' => 'Geração de Demanda', 'text' => 'Como sua empresa gera novos clientes hoje?', 'options' => [
                ['label' => 'Processos ativos de inbound e outbound funcionando', 'points' => 100],
                ['label' => 'Principalmente por indicações de clientes atuais', 'points' => 66],
                ['label' => 'Prospecção manual sem processo definido', 'points' => 33],
                ['label' => 'Não temos um processo claro de geração de clientes', 'points' => 0],
            ]],
            ['category' => 'Estrutura Comercial', 'text' => 'Você tem uma área comercial estruturada com time e metas?', 'options' => [
                ['label' => 'Sim, time dedicado, metas claras e métricas semanais', 'points' => 100],
                ['label' => 'Temos vendedores, mas sem processo bem definido', 'points' => 66],
                ['label' => 'O dono ou sócio centraliza todas as vendas', 'points' => 33],
                ['label' => 'Não temos ninguém focado em vendas', 'points' => 0],
            ]],
            ['category' => 'Conversão', 'text' => 'Qual é sua taxa de conversão de leads em clientes?', 'options' => [
                ['label' => 'Acima de 30% — fechamos a maioria dos leads qualificados', 'points' => 100],
                ['label' => 'Entre 15% e 30%', 'points' => 66],
                ['label' => 'Entre 5% e 15%', 'points' => 33],
                ['label' => 'Não sabemos ou é abaixo de 5%', 'points' => 0],
            ]],
            ['category' => 'Ferramentas e Dados', 'text' => 'Sua empresa usa CRM ou sistema de gestão de vendas?', 'options' => [
                ['label' => 'Sim, usamos ativamente com pipeline e histórico', 'points' => 100],
                ['label' => 'Temos CRM mas é pouco utilizado pelo time', 'points' => 66],
                ['label' => 'Usamos planilhas para controlar oportunidades', 'points' => 33],
                ['label' => 'Não usamos nenhuma ferramenta de gestão', 'points' => 0],
            ]],
            ['category' => 'Gestão e Ritmo', 'text' => 'Com que frequência você revisa resultados e metas comerciais?', 'options' => [
                ['label' => 'Semanalmente, com reuniões estruturadas de pipeline', 'points' => 100],
                ['label' => 'Mensalmente', 'points' => 66],
                ['label' => 'Raramente, quando surge algum problema', 'points' => 33],
                ['label' => 'Nunca revisamos formalmente', 'points' => 0],
            ]],
            ['category' => 'Principal Desafio', 'text' => 'Qual é o seu maior gargalo comercial hoje?', 'options' => [
                ['label' => 'Escalar o time mantendo qualidade e processo', 'points' => 100],
                ['label' => 'Converter mais leads que já chegam', 'points' => 66],
                ['label' => 'Gerar leads qualificados em volume suficiente', 'points' => 33],
                ['label' => 'Não sabemos onde estamos perdendo', 'points' => 0],
            ]],
            ['category' => 'Processo de Vendas', 'text' => 'Sua empresa tem playbook ou processo de vendas documentado?', 'options' => [
                ['label' => 'Sim, bem documentado e seguido por todo o time', 'points' => 100],
                ['label' => 'Existe algo, mas não é seguido consistentemente', 'points' => 66],
                ['label' => 'Estamos construindo, ainda não temos', 'points' => 33],
                ['label' => 'Cada vendedor faz do seu jeito', 'points' => 0],
            ]],
            ['category' => 'Qualidade de Leads', 'text' => 'Como você avalia a qualidade dos leads no seu funil?', 'options' => [
                ['label' => 'Muito qualificados — fechamos com facilidade', 'points' => 100],
                ['label' => 'Razoável, mas precisamos de muito esforço', 'points' => 66],
                ['label' => 'Poucos leads e maioria fora do perfil ideal', 'points' => 33],
                ['label' => 'Praticamente não recebemos leads', 'points' => 0],
            ]],
            ['category' => 'Maturidade Financeira', 'text' => 'Qual é o faturamento mensal atual da sua empresa?', 'options' => [
                ['label' => 'Acima de R$ 500 mil/mês', 'points' => 100],
                ['label' => 'Entre R$ 100 mil e R$ 500 mil/mês', 'points' => 75],
                ['label' => 'Entre R$ 30 mil e R$ 100 mil/mês', 'points' => 40],
                ['label' => 'Abaixo de R$ 30 mil/mês', 'points' => 10],
            ]],
        ];

        foreach ($defaults as $i => $q) {
            Question::create([
                'category' => $q['category'],
                'text'     => $q['text'],
                'options'  => $q['options'],
                'order'    => $i,
                'active'   => true,
            ]);
        }
    }
}
