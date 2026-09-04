<?php

namespace App\Http\Controllers;

use App\Models\AiSetting;
use App\Support\Masks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiSettingController extends Controller
{
    /**
     * Configuração atual (admin). A key nunca volta em texto puro — apenas
     * mascarada, para a tela poder mostrar "já configurada".
     */
    public function index(): JsonResponse
    {
        return response()->json($this->present(AiSetting::current()));
    }

    /**
     * Atualiza a API key da OpenAI (admin). Campo vazio não altera o valor
     * salvo — não existe fluxo de "desconfigurar" (ver Requisito 1.3 de
     * .kiro/specs/openai-key-configuravel-admin), já que ficar sem key
     * quebra a geração do relatório de diagnóstico.
     *
     * O modelo (openai_model) NÃO é editável por aqui de propósito — é um
     * valor fixo/interno (vive só no banco, semeado pela migração), não uma
     * configuração exposta ao admin.
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'openai_api_key' => 'nullable|string|max:255',
        ]);

        $settings = AiSetting::current();

        if (!empty($data['openai_api_key'])) {
            $settings->openai_api_key = $data['openai_api_key'];
            $settings->save();
        }

        return response()->json($this->present($settings));
    }

    private function present(AiSetting $settings): array
    {
        return [
            'openai_api_key_set'    => !empty($settings->openai_api_key),
            'openai_api_key_masked' => Masks::last4($settings->openai_api_key),
        ];
    }
}
