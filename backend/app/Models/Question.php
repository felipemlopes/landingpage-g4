<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Question extends Model
{
    use HasFactory;

    protected $fillable = [
        'category',
        'category_slug',
        'text',
        'type',
        'scored',
        'allow_other',
        'options',
        'order',
        'active',
    ];

    protected $casts = [
        'options'     => 'array',
        'order'       => 'integer',
        'active'      => 'boolean',
        'scored'      => 'boolean',
        'allow_other' => 'boolean',
    ];
}
