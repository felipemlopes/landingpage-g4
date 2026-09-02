<?php

namespace App\Http\Controllers;

use App\Models\PixelSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PixelSettingController extends Controller
{
    /**
     * Leitura pública — não é dado sensível, consumido direto pelo site
     * (<MetaPixel/>) e também usado pelo admin para pré-preencher o formulário.
     */
    public function show(): JsonResponse
    {
        return response()->json([
            'meta_pixel_id' => PixelSetting::current()->meta_pixel_id,
        ]);
    }

    /**
     * Atualiza o Pixel ID (admin). Aceita vazio para "desativar" o pixel
     * (mesmo efeito de nunca ter sido configurado).
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'meta_pixel_id' => 'nullable|string|regex:/^\d+$/|max:32',
        ]);

        $settings = PixelSetting::current();
        $settings->meta_pixel_id = $data['meta_pixel_id'] ?: null;
        $settings->save();

        return response()->json([
            'meta_pixel_id' => $settings->meta_pixel_id,
        ]);
    }
}
