<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\LeadController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\QuestionController;
use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - G4 Business Diagnóstico Comercial
|--------------------------------------------------------------------------
*/

// ── Rotas públicas ──────────────────────────────────────────────────────────

// Perguntas ativas do quiz (usadas pelo frontend público)
Route::get('/questions', [QuestionController::class, 'index']);

// Submissão de lead após o quiz
Route::post('/leads', [LeadController::class, 'store']);

// Geração de relatório PDF + envio WhatsApp (público)
Route::post('/report', [ReportController::class, 'generate']);

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

    // Leads
    Route::get('/leads',            [LeadController::class, 'index']);
    Route::delete('/leads/all',     [LeadController::class, 'destroyAll']);
    Route::get('/leads/export/csv', [LeadController::class, 'exportCsv']);
    Route::delete('/leads/{lead}',  [LeadController::class, 'destroy']);

    // Perguntas (gestão completa)
    Route::get('/questions',                  [QuestionController::class, 'adminIndex']);
    Route::post('/questions',                 [QuestionController::class, 'store']);
    Route::put('/questions/reorder',          [QuestionController::class, 'reorder']);
    Route::post('/questions/reset-defaults',  [QuestionController::class, 'resetDefaults']);
    Route::put('/questions/{question}',       [QuestionController::class, 'update']);
    Route::delete('/questions/{question}',    [QuestionController::class, 'destroy']);
});
