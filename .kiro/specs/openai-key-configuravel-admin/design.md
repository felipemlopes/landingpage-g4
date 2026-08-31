# Design — API Key da OpenAI configurável pelo admin

## Visão geral

Replica o padrão já usado para o Access Token da API oficial do WhatsApp
(campo sensível, mascarado na leitura, só sobrescrito quando um valor novo e
não vazio é enviado), aplicado a uma tabela nova com um único campo. A
diferença em relação ao caso do WhatsApp é a migração inicial: como o valor
já existe hoje em produção (`.env`) e é crítico para o produto funcionar, a
própria migração semeia a linha com o valor atual do `.env`, eliminando
qualquer janela de indisponibilidade.

```
Backend (Laravel)                              Frontend (React)
─────────────────                              ─────────────────
ai_settings (tabela, 1 linha)             ←→   IntegracoesPanel.jsx (admin, escreve)
  id | openai_api_key | timestamps
        ↑ (seed inicial = env('OPENAI_API_KEY') na migração)
AiSetting::current()
        ↑
AiSettingController (auth:api, prefix admin)
  index()   → GET /admin/ai-settings
  update()  → PUT /admin/ai-settings
        ↑ (fallback se banco vazio)
OpenAIService::__construct()  ←  config('services.openai.key')  [.env, só fallback]
```

`AI_PROVIDER` e `OPENAI_MODEL` não aparecem neste diagrama — continuam lidos
direto de `config('services.ai.provider')` / `config('services.openai.model')`,
sem nenhuma mudança.

## Backend

### Migração `create_ai_settings_table`

Tabela singleton, mesmo padrão de `whatsapp_settings`/`calendly_settings`,
mas com um passo extra: semear a linha com o valor atual do `.env` para não
quebrar a geração de relatórios entre o deploy e a primeira visita do admin
à tela.

```php
public function up(): void
{
    Schema::create('ai_settings', function (Blueprint $table) {
        $table->id();
        $table->text('openai_api_key')->nullable();
        $table->timestamps();
    });

    // Semeia com o valor atual do .env para não interromper a geração de
    // relatórios entre este deploy e a primeira vez que um admin abrir a
    // tela de Integrações. Sem isso, o banco nasceria vazio e o fallback
    // do Requisito 2.2 cobriria o buraco mesmo assim — mas prefere-se não
    // depender do fallback logo de cara.
    DB::table('ai_settings')->insert([
        'openai_api_key' => env('OPENAI_API_KEY'),
        'created_at'     => now(),
        'updated_at'     => now(),
    ]);
}
```

### Model `app/Models/AiSetting.php`

```php
class AiSetting extends Model
{
    protected $fillable = ['openai_api_key'];

    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1]);
    }
}
```

### Controller `app/Http/Controllers/AiSettingController.php`

```php
class AiSettingController extends Controller
{
    /** Configuração atual (admin). A key nunca volta em texto puro. */
    public function index(): JsonResponse
    {
        $settings = AiSetting::current();

        return response()->json([
            'openai_api_key_set'    => !empty($settings->openai_api_key),
            'openai_api_key_masked' => $this->maskKey($settings->openai_api_key),
        ]);
    }

    /** Atualiza a key (admin). Campo vazio = não altera (ver Requisito 1.3). */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'openai_api_key' => 'nullable|string|max:255',
        ]);

        $settings = AiSetting::current();

        if (!empty($data['openai_api_key'])) {
            $settings->openai_api_key = $data['openai_api_key'];
            $settings->save();
        }

        return response()->json([
            'openai_api_key_set'    => !empty($settings->openai_api_key),
            'openai_api_key_masked' => $this->maskKey($settings->openai_api_key),
        ]);
    }

    private function maskKey(?string $key): ?string
    {
        if (empty($key)) return null;

        $len = strlen($key);
        if ($len <= 4) return str_repeat('•', $len);

        return str_repeat('•', min($len - 4, 24)) . substr($key, -4);
    }
}
```

`maskKey()` é idêntico ao `maskToken()` já existente em `WhatsAppController`.
Duplicar o método (em vez de compartilhar) segue o mesmo estilo já usado no
projeto — cada controller é autocontido. Extrair um helper comum
(`App\Support\Masks::last4()`) é uma limpeza opcional, listada em `tasks.md`
como item não-crítico.

### Rotas (`routes/api.php`)

Dentro do grupo já existente `Route::middleware('auth:api')->prefix('admin')`,
junto das outras rotas de Integrações:

```php
// Integrações — IA (OpenAI)
Route::get('/ai-settings', [AiSettingController::class, 'index']);
Route::put('/ai-settings', [AiSettingController::class, 'update']);
```

Sem rota pública — ao contrário do Calendly, esta credencial nunca deve ser
lida por ninguém fora do admin autenticado.

### `OpenAIService` — troca a fonte da key

```php
public function __construct()
{
    $this->apiKey = AiSetting::current()->openai_api_key ?: config('services.openai.key');
    $this->model  = config('services.openai.model', 'gpt-4o-mini'); // inalterado
}
```

`GeminiService` e `AIProviderFactory` não mudam — fora de escopo (Requisito 2.3).

## Frontend

### `src/services/api.js` — novo grupo `aiSettingsApi`

```js
export const aiSettingsApi = {
  /** Configuração atual (admin) — key sempre mascarada */
  async getSettings() {
    return request('/admin/ai-settings');
  },

  /** Salva uma key nova (admin). Vazio é ignorado no backend — ver Requisito 1.3 */
  async saveSettings(openai_api_key) {
    return request('/admin/ai-settings', {
      method: 'PUT',
      body: JSON.stringify({ openai_api_key }),
    });
  },
};
```

### `src/pages/Admin/IntegracoesPanel.jsx` — novo card "IA (OpenAI)"

Mesmo visual e mesmo padrão de estado dos cards existentes (Calendly,
WhatsApp), reaproveitando o mesmo layout já usado para o Access Token da
Meta (campo `type="password"`, placeholder mostrando a versão mascarada
quando já configurada, texto de ajuda "Já configurada. Deixe em branco para
manter a chave atual."):

- Estado local: `aiSettings` (dado salvo vindo da API), `aiKeyForm` (valor do
  input), `savingAi`, `aiSaved`, `aiError` — mesmo padrão dos outros cards.
- `aiSettingsApi.getSettings()` entra no mesmo `Promise.all` de `loadAll()`
  já existente, junto de `whatsappApi.status()`, `whatsappApi.getSettings()`
  e `calendlySettingsApi.get()`.
- Campo único, `type="password"`, `placeholder={aiSettings?.openai_api_key_set ? aiSettings.openai_api_key_masked : 'sk-...'}`.
- Botão "Salvar key" desabilitado quando `aiKeyForm` está vazio — evita um
  `PUT` sem propósito (o backend já ignora vazio, mas não faz sentido
  habilitar o botão pra uma ação que não faz nada).
- `onSubmit` chama `aiSettingsApi.saveSettings(aiKeyForm)`; em sucesso, limpa
  o campo (a key nunca é re-exibida em texto puro) e atualiza
  `aiSettings`/mensagem "Configuração salva."; em erro, mostra a mensagem no
  mesmo estilo de erro já usado nos outros cards.

Não há nenhuma mudança em telas públicas (`ThankYou.jsx`, `Quiz.jsx` etc.) —
a key da OpenAI nunca foi e continua não sendo consumida pelo frontend
público.

## Alterações por arquivo (resumo)

| Arquivo | Mudança |
|---|---|
| `backend/database/migrations/..._create_ai_settings_table.php` | novo — cria tabela e semeia com `env('OPENAI_API_KEY')` |
| `backend/app/Models/AiSetting.php` | novo |
| `backend/app/Http/Controllers/AiSettingController.php` | novo |
| `backend/app/Services/AI/OpenAIService.php` | `__construct()` passa a ler `AiSetting::current()->openai_api_key`, com fallback pro `.env` |
| `backend/routes/api.php` | 2 rotas novas, ambas dentro do grupo `auth:api`/`prefix('admin')` (`GET` e `PUT /ai-settings`) |
| `src/services/api.js` | novo grupo `aiSettingsApi` (`getSettings`, `saveSettings`) |
| `src/pages/Admin/IntegracoesPanel.jsx` | novo card "IA (OpenAI)" |
| `backend/.env.example` | comentário indicando que `OPENAI_API_KEY` agora é só o valor inicial/fallback (a fonte de verdade passa a ser o admin) |

## Casos de borda considerados

| Cenário | Comportamento |
|---|---|
| Logo após o deploy desta spec (banco recém-semeado a partir do `.env`) | `GET /admin/ai-settings` já retorna `openai_api_key_set: true` com a máscara da key que estava no `.env` — nenhuma interrupção na geração de relatórios. |
| Nunca existiu key (nem `.env` nem admin) — ex. ambiente novo | `openai_api_key_set: false`, campo vazio no admin; geração de relatório falha do mesmo jeito que falharia hoje sem `OPENAI_API_KEY` no `.env`. |
| Admin salva o campo em branco | Backend ignora — key salva anteriormente permanece; botão de salvar já vem desabilitado nesse caso no frontend. |
| Banco tem key mas alguém apaga a variável do `.env` depois | Sem efeito — o banco já é a fonte primária (Requisito 2.2), o `.env` só é consultado se o banco estiver vazio. |
| Key inválida salva pelo admin (typo, key revogada) | Só se manifesta na próxima geração de relatório, como uma falha 401 da OpenAI — mesmo tratamento de erro que já existe em `OpenAIService`/`DiagnosticReportService`, sem mudança. |
| Duas abas do admin salvando ao mesmo tempo | Última escrita vence — mesmo comportamento aceito para `WhatsappSetting`/`CalendlySetting` (singleton sem lock otimista). |

## Por que semear o banco na migração, diferente da spec do Calendly

A spec [[calendly-configuravel-admin]] aceitou conscientemente que, em
produção, um admin precisaria colar o link manualmente depois do deploy —
aceitável porque, até lá, só um botão de CTA fica desabilitado. Aqui, a
ausência da key interrompe a geração do relatório de diagnóstico, que é o
núcleo do funil (lead completa o quiz → espera o PDF/WhatsApp). Por isso,
nesta spec, vale o esforço extra de ler `env('OPENAI_API_KEY')` diretamente
na migração e gravar esse valor como seed inicial — eliminando a janela de
indisponibilidade que a spec do Calendly aceitou para o caso dela.
