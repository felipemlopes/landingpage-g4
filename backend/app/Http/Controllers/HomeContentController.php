<?php

namespace App\Http\Controllers;

use App\Models\HomeContentSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HomeContentController extends Controller
{
    /** Leitura pública — consumida pelo <Hero/> no site e para pré-preencher o admin. */
    public function show(): JsonResponse
    {
        return response()->json(HomeContentSetting::current()->resolved());
    }

    /**
     * Atualiza os textos da Home (admin). Cada campo é tratado
     * independentemente: enviado vazio, aquele campo volta ao padrão;
     * campo ausente do payload não é tocado.
     */
    public function update(Request $request): JsonResponse
    {
        $fields = array_keys(HomeContentSetting::DEFAULTS);
        $rules  = array_fill_keys($fields, 'nullable|string|max:300');
        $data   = $request->validate($rules);

        $settings = HomeContentSetting::current();
        foreach ($fields as $field) {
            if ($request->has($field)) {
                $settings->{$field} = $data[$field] ?: null;
            }
        }
        $settings->save();

        return response()->json($settings->resolved());
    }
}
