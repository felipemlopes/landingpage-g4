<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class ProfileController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $user = Auth::guard('api')->user();

        $data = $request->validate([
            'name'                  => 'required|string|max:255',
            'email'                 => 'required|email|max:255|unique:users,email,' . $user->id,
            'current_password'      => 'nullable|string',
            'password'              => ['nullable', 'string', Password::min(6), 'confirmed'],
        ]);

        // Se quiser trocar senha, valida a atual
        if (!empty($data['password'])) {
            if (empty($data['current_password']) || !Hash::check($data['current_password'], $user->password)) {
                return response()->json(['message' => 'Senha atual incorreta.'], 422);
            }
            $user->password = Hash::make($data['password']);
        }

        $user->name  = $data['name'];
        $user->email = $data['email'];
        $user->save();

        return response()->json($user);
    }
}
