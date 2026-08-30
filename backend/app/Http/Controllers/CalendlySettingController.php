<?php

namespace App\Http\Controllers;

use App\Models\CalendlySetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalendlySettingController extends Controller
{
    /**
     * Leitura pública — não é dado sensível, consumido diretamente pelo site
     * (ThankYou.jsx) e também usado pelo admin para pré-preencher o formulário.
     */
    public function show(): JsonResponse
    {
        return response()->json([
            'url' => CalendlySetting::current()->url,
        ]);
    }

    /**
     * Atualiza o link do Calendly (admin). Aceita vazio para "desconfigurar"
     * (mesmo efeito de VITE_CALENDLY_URL ausente, antes desta spec).
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'url' => 'nullable|url|max:2048',
        ]);

        $settings = CalendlySetting::current();
        $settings->url = $data['url'] ?? null;
        $settings->save();

        return response()->json([
            'url' => $settings->url,
        ]);
    }
}
