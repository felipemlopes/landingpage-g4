<?php

namespace App\Http\Controllers;

use App\Models\AiPromptSetting;
use App\Services\AI\OpenAIService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiPromptSettingController extends Controller
{
    // PHP não permite acessar a constante de uma trait diretamente pelo nome
    // dela (`PromptBuilder::DEFAULT_PROMPT_TEMPLATE` é um erro fatal fora de
    // uma classe que usa a trait) — referenciamos via OpenAIService, que
    // consome a trait. GeminiService (também consumidor) serviria igual.

    /** Configuração atual (admin). Devolve também o padrão, pra placeholder/preview no frontend. */
    public function index(): JsonResponse
    {
        return response()->json([
            'prompt_template' => AiPromptSetting::current()->prompt_template,
            'prompt_default'  => OpenAIService::DEFAULT_PROMPT_TEMPLATE,
        ]);
    }

    /** Atualiza o template (admin). Vazio restaura o padrão embutido (não desativa a geração). */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'prompt_template' => 'nullable|string|max:6000',
        ]);

        $settings = AiPromptSetting::current();
        $settings->prompt_template = $data['prompt_template'] ?: null;
        $settings->save();

        return response()->json([
            'prompt_template' => $settings->prompt_template,
            'prompt_default'  => OpenAIService::DEFAULT_PROMPT_TEMPLATE,
        ]);
    }
}
