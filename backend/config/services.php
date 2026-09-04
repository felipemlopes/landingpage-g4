<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
        'scheme' => 'https',
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'gemini' => [
        'key' => env('GEMINI_API_KEY'),
    ],

    'openai' => [
        // Nomes prefixados com G4_ de propósito: "OPENAI_API_KEY"/"OPENAI_MODEL"
        // colidem com variáveis de ambiente globais (nível Windows User) de
        // outra ferramenta de IA nesta máquina — env vars de sistema têm
        // prioridade sobre o .env, então os nomes genéricos silenciosamente
        // pisavam na key/modelo deste projeto. Ver .env.example.
        'key'   => env('G4_OPENAI_API_KEY'),
        'model' => env('G4_OPENAI_MODEL', 'gpt-4o-mini'),
    ],

    'ai' => [
        // openai | gemini
        'provider' => env('AI_PROVIDER', 'openai'),
    ],

    // Evolution API — só a URL e a API Key ficam no .env (credenciais de infra).
    // O provider ativo (evolution | official) e os dados da API oficial (Meta)
    // são configurados pelo admin na tela de Integrações e ficam em
    // App\Models\WhatsappSetting. O nome da instância da Evolution é
    // gerenciado pela aplicação (não é editável pelo admin).
    'evolution' => [
        'url'              => env('EVOLUTION_API_URL'),
        'key'              => env('EVOLUTION_API_KEY'),
        'default_instance' => env('EVOLUTION_DEFAULT_INSTANCE', 'g4'),
    ],

];
