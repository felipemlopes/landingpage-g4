<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    protected $fillable = [
        'token',
        'lead_id',
        'status',
        'filename',
        'pdf_path',
        'whatsapp_sent',
        'error',
        'payload',
    ];

    protected $casts = [
        'payload'       => 'array',
        'whatsapp_sent' => 'boolean',
    ];

    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }
}
