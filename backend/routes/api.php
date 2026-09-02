<?php

use App\Http\Controllers\AiSettingController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CalendlySettingController;
use App\Http\Controllers\LeadController;
use App\Http\Controllers\MessageSettingController;
use App\Http\Controllers\PixelSettingController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\QuestionController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\WhatsAppController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Diagnóstico Comercial
|--------------------------------------------------------------------------
*/

// ── Rotas públicas ──────────────────────────────────────────────────────────

// Perguntas ativas do quiz (usadas pelo frontend público)
Route::get('/questions', [QuestionController::class, 'index']);

// Submissão de lead após o quiz
Route::post('/leads', [LeadController::class, 'store']);

// Perguntas de qualificação pós-resultado (intenção de compra + fit de investimento)
Route::put('/leads/{lead}/qualify', [LeadController::class, 'qualify']);

// Geração de relatório PDF + envio WhatsApp — enfileira e devolve report_id (público)
Route::post('/report', [ReportController::class, 'generate']);

// Polling do status/resultado do relatório enfileirado (público, resolvido por token opaco)
Route::get('/report/{report:token}', [ReportController::class, 'show']);

// Link de agendamento do Calendly configurado pelo admin (público, não sensível)
Route::get('/calendly-settings', [CalendlySettingController::class, 'show']);

// Pixel ID da Meta configurado pelo admin (público, não sensível — consumido pelo <MetaPixel/>)
Route::get('/pixel-settings', [PixelSettingController::class, 'show']);

// Autenticação admin
Route::prefix('auth')->group(function () {
    Route::post('/login',   [AuthController::class, 'login']);
    Route::post('/refresh', [AuthController::class, 'refresh'])->middleware('auth:api');
    Route::post('/logout',  [AuthController::class, 'logout'])->middleware('auth:api');
    Route::get('/me',       [AuthController::class, 'me'])->middleware('auth:api');
});

// ── Rotas autenticadas (admin) ───────────────────────────────────────────────
Route::middleware('auth:api')->prefix('admin')->group(function () {

    // Perfil
    Route::put('/profile', [ProfileController::class, 'update']);

    // Integrações — WhatsApp
    Route::get('/whatsapp/status',   [WhatsAppController::class, 'status']);
    Route::post('/whatsapp/connect', [WhatsAppController::class, 'connect']);
    Route::get('/whatsapp/settings', [WhatsAppController::class, 'settings']);
    Route::put('/whatsapp/settings', [WhatsAppController::class, 'updateSettings']);

    // Integrações — Calendly
    Route::put('/calendly-settings', [CalendlySettingController::class, 'update']);

    // Integrações — IA (OpenAI). Sem rota pública: a key nunca é lida fora
    // do admin autenticado (ao contrário do link do Calendly).
    Route::get('/ai-settings', [AiSettingController::class, 'index']);
    Route::put('/ai-settings', [AiSettingController::class, 'update']);

    // Integrações — Mensagem do WhatsApp. Sem rota pública: só o backend
    // consome o template (o texto em si não é exibido ao lead antes do envio).
    Route::get('/message-settings', [MessageSettingController::class, 'index']);
    Route::put('/message-settings', [MessageSettingController::class, 'update']);

    // Integrações — Pixel da Meta. Leitura é pública (ver rota acima); só a
    // escrita exige admin.
    Route::put('/pixel-settings', [PixelSettingController::class, 'update']);

    // Leads
    Route::get('/leads',                    [LeadController::class, 'index']);
    Route::delete('/leads/all',             [LeadController::class, 'destroyAll']);
    Route::get('/leads/export/xlsx',        [LeadController::class, 'exportXlsx']);
    Route::post('/leads/{lead}/resend-report', [ReportController::class, 'resend']);
    Route::delete('/leads/{lead}',          [LeadController::class, 'destroy']);

    // Perguntas (gestão completa)
    Route::get('/questions',                  [QuestionController::class, 'adminIndex']);
    Route::post('/questions',                 [QuestionController::class, 'store']);
    Route::put('/questions/reorder',          [QuestionController::class, 'reorder']);
    Route::post('/questions/reset-defaults',  [QuestionController::class, 'resetDefaults']);
    Route::put('/questions/{question}',       [QuestionController::class, 'update']);
    Route::delete('/questions/{question}',    [QuestionController::class, 'destroy']);
});
