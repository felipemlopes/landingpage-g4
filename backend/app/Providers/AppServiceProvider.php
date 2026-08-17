<?php

namespace App\Providers;

use App\Services\AI\AIProviderFactory;
use App\Services\AI\AIReportProviderInterface;
use App\Services\WhatsApp\WhatsAppProviderFactory;
use App\Services\WhatsApp\WhatsAppProviderInterface;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(WhatsAppProviderInterface::class, fn () => WhatsAppProviderFactory::make());
        $this->app->bind(AIReportProviderInterface::class, fn () => AIProviderFactory::make());
    }

    public function boot(): void
    {
        Schema::defaultStringLength(191);
    }
}
