<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PixelSetting extends Model
{
    protected $fillable = [
        'meta_pixel_id',
    ];

    /**
     * Configuração é uma linha única (singleton) — cria com valores padrão
     * na primeira leitura. Mesmo padrão de CalendlySetting::current().
     */
    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1]);
    }
}
