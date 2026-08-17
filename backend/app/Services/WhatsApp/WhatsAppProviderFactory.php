<?php

namespace App\Services\WhatsApp;

use App\Models\WhatsappSetting;

class WhatsAppProviderFactory
{
    public static function make(): WhatsAppProviderInterface
    {
        return match (WhatsappSetting::current()->provider) {
            'official' => new OfficialCloudApiProvider(),
            default    => new EvolutionProvider(),
        };
    }
}
