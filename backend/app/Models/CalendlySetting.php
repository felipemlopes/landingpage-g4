<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CalendlySetting extends Model
{
    protected $fillable = [
        'url',
    ];

    /**
     * Configuração é uma linha única (singleton) — cria com valores padrão
     * na primeira leitura. Mesmo padrão de WhatsappSetting::current().
     */
    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1]);
    }
}
