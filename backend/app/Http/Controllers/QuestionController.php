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
     * As perguntas padrão vêm de Question::defaults() — fonte única
     * compartilhada com QuestionSeeder (banco novo), pra nunca mais divergir
     * do que este reset aplica.
     */
    private function seedDefaults(): void
    {
        foreach (Question::defaults() as $i => $q) {
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
