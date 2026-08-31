<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiSetting extends Model
{
    protected $fillable = [
        'openai_api_key',
    ];

    /**
     * Configuração é uma linha única (singleton) — cria vazia na primeira
     * leitura se a migração (que já semeia a partir do .env) nunca rodou.
     */
    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1]);
    }
}
