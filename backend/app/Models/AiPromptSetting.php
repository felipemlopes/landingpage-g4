<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiPromptSetting extends Model
{
    protected $fillable = [
        'prompt_template',
    ];

    /**
     * Configuração é uma linha única (singleton) — cria com valores padrão
     * na primeira leitura. Mesmo padrão de MessageSetting::current().
     */
    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1]);
    }
}
