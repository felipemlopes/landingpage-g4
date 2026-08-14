<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Question extends Model
{
    use HasFactory;

    protected $fillable = [
        'category',
        'text',
        'options',
        'order',
        'active',
    ];

    protected $casts = [
        'options' => 'array',
        'order'   => 'integer',
        'active'  => 'boolean',
    ];
}
