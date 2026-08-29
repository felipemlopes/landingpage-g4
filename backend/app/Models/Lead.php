<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Lead extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'email',
        'score',
        'answers',
        'area_atuacao',
        'faturamento_band',
        'level',
        'bottleneck_category',
        'intencao_descoberta',
        'intencao_compra',
        'fit_investimento',
    ];

    protected $casts = [
        'answers'             => 'array',
        'score'               => 'integer',
        'level'               => 'integer',
        'report_generated_at' => 'datetime',
    ];
}
