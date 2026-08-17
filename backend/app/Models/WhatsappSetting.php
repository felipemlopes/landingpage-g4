<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WhatsappSetting extends Model
{
    protected $fillable = [
        'provider',
        'cloud_token',
        'cloud_phone_number_id',
        'cloud_waba_id',
    ];

    /**
     * Configuração é uma linha única (singleton) — cria com valores padrão
     * na primeira leitura.
     */
    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1], ['provider' => 'evolution']);
    }
}
