<?php

namespace App\Services\AI;

class AIProviderFactory
{
    public static function make(): AIReportProviderInterface
    {
        return match (config('services.ai.provider', 'openai')) {
            'gemini' => new GeminiService(),
            default  => new OpenAIService(),
        };
    }
}
