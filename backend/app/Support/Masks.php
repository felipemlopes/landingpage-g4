<?php

namespace App\Support;

class Masks
{
    /**
     * Mascara um valor sensível (token/API key) mantendo só os últimos 4
     * caracteres visíveis — usado para exibir "já configurado" no admin sem
     * nunca devolver o valor em texto puro.
     */
    public static function last4(?string $value): ?string
    {
        if (empty($value)) return null;

        $len = strlen($value);
        if ($len <= 4) return str_repeat('•', $len);

        return str_repeat('•', min($len - 4, 24)) . substr($value, -4);
    }
}
