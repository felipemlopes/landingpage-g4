# Design — Desconectar WhatsApp, Prompt da IA e Textos da Home configuráveis pelo admin

## Visão geral

Três mudanças independentes, sem dependência entre si — cada uma reaproveita
um padrão já existente no projeto em vez de introduzir mecanismo novo:

```
Requisito 1 (desconectar WhatsApp)   Requisito 2 (prompt da IA)         Requisito 3 (textos Home)
───────────────────────────────      ───────────────────────────       ───────────────────────────
WhatsAppProviderInterface             ai_prompt_settings (tabela)        home_content_settings (tabela)
  + disconnect()                        ↕ admin only                      ↕ GET público / PUT admin
EvolutionProvider::disconnect()       AiPromptSettingController          HomeContentController
  → logout da instância                 ↕                                  ↕
OfficialCloudApiProvider::disconnect()PromptBuilder::buildPrompt()       <Hero/> (fetch on mount,
  → apaga credenciais salvas            (strtr no template, mesmo          fallback nos textos atuais)
WhatsAppController::disconnect()        padrão do MessageSetting)        ConteudoPanel.jsx (novo, admin)
  → POST /admin/whatsapp/disconnect
```

Requisito 2 replica **exatamente** o padrão já usado para a mensagem do
WhatsApp (`MessageSetting`/`MessageSettingController`, spec
[[whatsapp-pixel-meta-textos-hero]]): tabela singleton, `strtr()` com
variáveis nomeadas, "vazio restaura o padrão". Requisito 3 replica o padrão
do Calendly/Pixel (leitura pública, escrita admin). Requisito 1 é o único
que não tem um precedente direto — é a peça nova desta spec.

---

## Requisito 1 — Desconectar o WhatsApp

### Backend

**`WhatsAppProviderInterface` — novo método:**
```php
/**
 * Encerra a conexão/credenciais ativas.
 * Evolution: logout da instância (mantém a instância criada, exige novo QR).
 * API oficial: apaga o token e os IDs salvos.
 * ['disconnected' => bool, 'detail' => string]
 */
public function disconnect(): array;
```

**`EvolutionProvider::disconnect()`** — usa o endpoint de logout da Evolution
API (mantém a instância, só encerra a sessão pareada — equivalente a "sair"
no WhatsApp Web):
```php
public function disconnect(): array
{
    if (!$this->enabled) {
        return ['disconnected' => false, 'detail' => 'Evolution API não configurada.'];
    }

    try {
        $response = Http::timeout(15)
            ->withHeaders(['apikey' => $this->apiKey])
            ->delete("{$this->url}/instance/logout/{$this->instance}");

        // 404 = instância não existe (nunca conectada) — já está "desconectado".
        if ($response->status() === 404 || $response->successful()) {
            return [
                'disconnected' => true,
                'detail'       => 'WhatsApp desconectado. Clique em "Conectar" para parear um novo número.',
            ];
        }

        Log::warning('Evolution API: falha ao desconectar instância', [
            'instance' => $this->instance,
            'status'   => $response->status(),
            'body'     => $response->body(),
        ]);

        return [
            'disconnected' => false,
            'detail'       => 'Não foi possível desconectar: ' . ($response->json('message') ?? 'erro desconhecido'),
        ];
    } catch (\Throwable $e) {
        return ['disconnected' => false, 'detail' => 'Erro ao desconectar: ' . $e->getMessage()];
    }
}
```
Reaproveita `$this->url`/`$this->apiKey`/`$this->instance` já existentes no
construtor (idêntico aos outros métodos da classe). Depois de um logout
bem-sucedido, `connect()` (código já existente, `EvolutionProvider.php:136-194`)
já lida corretamente com "instância existe mas não pareada" — cai direto em
`fetchQrCode()` sem recriar a instância, então nenhuma mudança é necessária
em `connect()`.

**`OfficialCloudApiProvider::disconnect()`** — não existe "sessão" na API
oficial (é um token de longa duração), então desconectar aqui é apagar as
credenciais salvas:
```php
public function disconnect(): array
{
    $settings = WhatsappSetting::current();
    $settings->cloud_token           = null;
    $settings->cloud_phone_number_id = null;
    $settings->cloud_waba_id         = null;
    $settings->save();

    return [
        'disconnected' => true,
        'detail'       => 'Credenciais removidas. Configure o Access Token e o Phone Number ID novamente para reconectar.',
    ];
}
```

**`WhatsAppController` — nova action:**
```php
public function disconnect(): JsonResponse
{
    $result = $this->whatsapp->disconnect();

    return response()->json([
        'provider'     => WhatsappSetting::current()->provider,
        'disconnected' => $result['disconnected'],
        'detail'       => $result['detail'],
    ]);
}
```

**Rota**, junto das outras de WhatsApp no grupo `auth:api`/`prefix('admin')`:
```php
Route::post('/whatsapp/disconnect', [WhatsAppController::class, 'disconnect']);
```

### Frontend

**`src/services/api.js` — `whatsappApi` ganha um método:**
```js
/** Desconecta o WhatsApp (logout na Evolution, ou apaga credenciais na API oficial) */
async disconnect() {
  return request('/admin/whatsapp/disconnect', { method: 'POST' });
},
```

**`IntegracoesPanel.jsx` — bloco "Status / conexão"** (linhas 437-483):
- Novo estado: `disconnecting`, `showDisconnectModal`.
- Novo botão "Desconectar" (`btn btn-danger` — mesma classe do
  `ConfirmModal` em modo `danger`), visível/habilitado só quando
  `status?.connected` é `true` (Requisito 1.6); ao clicar, abre um
  `ConfirmModal` (componente já existente em `src/pages/Admin/ConfirmModal.jsx`,
  já usado em outras ações destrutivas do painel) com mensagem específica
  por provider:
  - Evolution: *"Isso encerra a sessão pareada. Você vai precisar escanear
    um novo QR Code para reconectar."*
  - API oficial: *"Isso remove o Access Token e o Phone Number ID salvos.
    Você vai precisar configurá-los novamente para reconectar."*
- `onConfirm` do modal chama `whatsappApi.disconnect()`; em sucesso, fecha o
  modal, chama `loadStatus()` e, se o provider é `official`, também
  `whatsappApi.getSettings()` de novo (via `applySettings`) para o
  formulário de credenciais refletir os campos apagados; em erro, mostra a
  mensagem no bloco de erro já existente.
- Nenhuma mudança no modal de QR Code (`showConnectModal`) — desconectar e
  conectar continuam fluxos separados.

---

## Requisito 2 — Prompt da IA editável

### Backend

**Migração `create_ai_prompt_settings_table`:**
```php
Schema::create('ai_prompt_settings', function (Blueprint $table) {
    $table->id();
    $table->text('prompt_template')->nullable();
    $table->timestamps();
});
```
Sem seed — igual ao `MessageSetting` (spec [[whatsapp-pixel-meta-textos-hero]]):
o fallback já vive em código, a tabela nasce vazia sem janela de
indisponibilidade.

**Model `app/Models/AiPromptSetting.php`:**
```php
class AiPromptSetting extends Model
{
    protected $fillable = ['prompt_template'];

    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1]);
    }
}
```

**`PromptBuilder` — template vira constante + `strtr()`** (substitui o
heredoc fixo de `backend/app/Services/AI/PromptBuilder.php:37-63`):
```php
trait PromptBuilder
{
    public const DEFAULT_PROMPT_TEMPLATE = <<<PROMPT
Você é um especialista em estratégia comercial da {marca}.
Gere um relatório de diagnóstico comercial PERSONALIZADO e PROFISSIONAL em português brasileiro para a empresa do lead abaixo.

DADOS DO LEAD:
- Nome: {nome}
- Score geral: {pontuacao}/100
- Nível de maturidade: {nivel}

RESPOSTAS DO DIAGNÓSTICO:
{respostas}

INSTRUÇÕES:
- Escreva em HTML simples (use apenas: h1, h2, h3, p, ul, li, strong, em, div com class)
- Use as classes: "section", "highlight", "warning", "success", "tip"
- Seja ESPECÍFICO e cite as respostas do lead
- Estrutura obrigatória:
  1. Saudação personalizada com o nome
  2. Resumo do diagnóstico (score e nível)
  3. Pontos fortes identificados (baseado nas respostas com maior pontuação)
  4. Principais gargalos (baseado nas respostas com menor pontuação)
  5. Plano de ação: 3 recomendações práticas e específicas
  6. Próximos passos com a {marca}
- Tom: profissional, direto, motivador
- NÃO inclua <!DOCTYPE>, <html>, <head>, <body> ou estilos CSS inline
- Máximo 600 palavras
PROMPT;

    private function buildPrompt(array $data): string
    {
        $name      = $data['name'];
        $score     = $data['score'];
        $answers   = $data['answers'] ?? [];
        $questions = $data['questions'] ?? [];

        $level = match (true) {
            $score >= 75 => 'Maturidade Avançada',
            $score >= 50 => 'Em Transição',
            $score >= 25 => 'Maturidade Inicial',
            default      => 'Diagnóstico Crítico',
        };

        $answersText = '';
        foreach ($questions as $i => $q) {
            $pts = $answers[$i] ?? 0;
            $selectedOption = '';
            foreach (($q['options'] ?? []) as $opt) {
                if ((int)$opt['points'] === (int)$pts) {
                    $selectedOption = $opt['label'];
                    break;
                }
            }
            $answersText .= "- {$q['category']}: {$selectedOption} ({$pts} pts)\n";
        }

        $template = AiPromptSetting::current()->prompt_template ?: self::DEFAULT_PROMPT_TEMPLATE;

        return strtr($template, [
            '{nome}'      => $name,
            '{pontuacao}' => (string) $score,
            '{nivel}'     => $level,
            '{respostas}' => $answersText,
            '{marca}'     => config('app.name'),
        ]);
    }
}
```
PHP 8.2 (versão confirmada no ambiente) permite constantes em trait, mas
**não** é possível acessá-las diretamente pelo nome da trait
(`PromptBuilder::DEFAULT_PROMPT_TEMPLATE` de fora é um erro fatal —
confirmado rodando o endpoint) — só através de uma classe que usa a trait.
Por isso o controller referencia `OpenAIService::DEFAULT_PROMPT_TEMPLATE`
(ver seção do controller abaixo), não a trait diretamente. `strtr` (não
regex) pelo mesmo motivo já documentado na spec do WhatsApp: um `{` literal
digitado pelo admin não quebra nada.

**Controller `app/Http/Controllers/AiPromptSettingController.php`**
(mesma forma exata de `MessageSettingController`):
```php
class AiPromptSettingController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'prompt_template' => AiPromptSetting::current()->prompt_template,
            'prompt_default'  => OpenAIService::DEFAULT_PROMPT_TEMPLATE,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'prompt_template' => 'nullable|string|max:6000',
        ]);

        $settings = AiPromptSetting::current();
        $settings->prompt_template = $data['prompt_template'] ?: null;
        $settings->save();

        return response()->json([
            'prompt_template' => $settings->prompt_template,
            'prompt_default'  => OpenAIService::DEFAULT_PROMPT_TEMPLATE,
        ]);
    }
}
```
`AiPromptSettingController` não usa a trait diretamente — referencia a
constante através de `OpenAIService` (consumidor da trait), já que PHP não
permite `PromptBuilder::DEFAULT_PROMPT_TEMPLATE` de fora de uma classe que
usa a trait. `GeminiService` (o outro consumidor) serviria igual — a
escolha de `OpenAIService` aqui é arbitrária.

**Rotas**, dentro do grupo `auth:api`/`prefix('admin')`, sem rota pública —
mesmo raciocínio já usado para `message-settings` (só o backend consome o
template):
```php
Route::get('/ai-prompt-settings', [AiPromptSettingController::class, 'index']);
Route::put('/ai-prompt-settings', [AiPromptSettingController::class, 'update']);
```

### Frontend

**`src/services/api.js` — novo grupo `aiPromptSettingsApi`:**
```js
export const aiPromptSettingsApi = {
  async getSettings() {
    return request('/admin/ai-prompt-settings');
  },
  async saveSettings(prompt_template) {
    return request('/admin/ai-prompt-settings', {
      method: 'PUT',
      body: JSON.stringify({ prompt_template }),
    });
  },
};
```

**`IntegracoesPanel.jsx` — novo card "Prompt da IA"**, logo abaixo do card
"IA (OpenAI)" existente, mesmo padrão visual do card "Mensagem do WhatsApp":
- Estado: `promptSettings`, `promptForm`, `savingPrompt`, `promptSaved`, `promptError`.
- `aiPromptSettingsApi.getSettings()` entra no `Promise.all` de `loadAll()`.
- `<textarea rows={16}>` com `value={promptForm}`,
  `placeholder={promptSettings?.prompt_default}`.
- Bloco de ajuda listando as variáveis: `{nome}`, `{pontuacao}`, `{nivel}`,
  `{respostas}`, `{marca}`.
- Contador de caracteres (`promptForm.length / 6000`), vermelho se
  ultrapassar.
- **Preview ao vivo**: bloco somente-leitura abaixo do textarea, com valores
  de exemplo fixos no frontend — nome "João Silva", pontuação 82, nível "Em
  Transição", uma lista curta de respostas de exemplo, e `{marca}` = `APP_NAME`
  (já importado de `../../config/brand` em outros pontos do admin) — troca
  client-side pura, sem chamada de API, igual ao preview da mensagem do
  WhatsApp.
- Botões "Salvar prompt" (desabilitado se ultrapassar 6000 caracteres) e
  "Restaurar padrão" (`saveSettings('')`, igual ao fluxo do template do
  WhatsApp).

---

## Requisito 3 — Textos da Home (Hero) editáveis

### Backend

**Migração `create_home_content_settings_table`:**
```php
Schema::create('home_content_settings', function (Blueprint $table) {
    $table->id();
    $table->string('badge_text')->nullable();
    $table->string('headline_line1')->nullable();
    $table->string('headline_highlight')->nullable();
    $table->string('headline_line3')->nullable();
    $table->text('subheadline')->nullable();
    $table->string('stat1_value')->nullable();
    $table->string('stat1_label')->nullable();
    $table->string('stat2_value')->nullable();
    $table->string('stat2_label')->nullable();
    $table->string('stat3_value')->nullable();
    $table->string('stat3_label')->nullable();
    $table->string('cta_button_text')->nullable();
    $table->string('cta_subtext')->nullable();
    $table->timestamps();
});
```
Todos nullable, sem seed — cada campo cai no valor padrão (texto atual do
`Hero.jsx`) quando `null`, exatamente como os outros "vazio = usa padrão"
já implementados.

**Model `app/Models/HomeContentSetting.php`:**
```php
class HomeContentSetting extends Model
{
    protected $fillable = [
        'badge_text', 'headline_line1', 'headline_highlight', 'headline_line3',
        'subheadline', 'stat1_value', 'stat1_label', 'stat2_value', 'stat2_label',
        'stat3_value', 'stat3_label', 'cta_button_text', 'cta_subtext',
    ];

    /** Valores padrão — o texto hoje fixo em Hero.jsx, usado quando um campo está null. */
    public const DEFAULTS = [
        'badge_text'         => 'Diagnóstico gratuito · 2 min',
        'headline_line1'     => 'Diagnóstico gratuito de como estruturar',
        'headline_highlight' => 'marketing, comercial e vendas',
        'headline_line3'     => 'do seu escritório',
        'subheadline'        => 'Descubra em 2 minutos onde está o gargalo que trava o crescimento de seu escritório — e receba um plano personalizado no WhatsApp para parar de depender de indicação.',
        'stat1_value'        => '9',
        'stat1_label'        => 'Perguntas',
        'stat2_value'        => '2min',
        'stat2_label'        => 'Para concluir',
        'stat3_value'        => '100%',
        'stat3_label'        => 'Gratuito',
        'cta_button_text'    => 'Começar diagnóstico',
        'cta_subtext'        => 'Sem compromisso · Resultado imediato',
    ];

    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1]);
    }

    /** Cada campo resolvido: valor salvo, ou o padrão se null. */
    public function resolved(): array
    {
        $out = [];
        foreach (self::DEFAULTS as $field => $default) {
            $out[$field] = $this->{$field} ?: $default;
        }
        return $out;
    }
}
```

**Controller `app/Http/Controllers/HomeContentController.php`:**
```php
class HomeContentController extends Controller
{
    /** Leitura pública — consumida pelo <Hero/> no site e para pré-preencher o admin */
    public function show(): JsonResponse
    {
        return response()->json(HomeContentSetting::current()->resolved());
    }

    /** Atualiza os textos (admin). Campo vazio = volta ao padrão daquele campo. */
    public function update(Request $request): JsonResponse
    {
        $fields = array_keys(HomeContentSetting::DEFAULTS);
        $rules  = array_fill_keys($fields, 'nullable|string|max:300');
        $data   = $request->validate($rules);

        $settings = HomeContentSetting::current();
        foreach ($fields as $field) {
            if ($request->has($field)) {
                $settings->{$field} = $data[$field] ?: null;
            }
        }
        $settings->save();

        return response()->json($settings->resolved());
    }
}
```
`max:300` é um limite genérico de segurança (evita um valor absurdamente
longo quebrar o layout) — a task de implementação pode refinar por campo
(ex. `subheadline` pode ter um limite maior que `stat1_value`).

**Rotas** — pública junto das outras (`GET /home-content`), admin dentro do
grupo já existente:
```php
// pública
Route::get('/home-content', [HomeContentController::class, 'show']);
// admin
Route::put('/admin/home-content', [HomeContentController::class, 'update']);
```

### Frontend

**`src/services/api.js` — novo grupo `homeContentApi`:**
```js
export const homeContentApi = {
  async get() {
    return request('/home-content');
  },
  async save(payload) {
    return request('/admin/home-content', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};
```

**`Hero.jsx`** — os literais hoje fixos (linhas 86, 101-105, 119, 138-142,
171, 177) viram um `content` no estado do componente, inicializado com os
mesmos valores padrão (para o primeiro paint não mudar em nada) e
sobrescrito se a busca assíncrona retornar valores diferentes:
```jsx
import { useEffect, useState } from 'react';
import { homeContentApi } from '../services/api';

const DEFAULT_CONTENT = {
  badge_text: 'Diagnóstico gratuito · 2 min',
  headline_line1: 'Diagnóstico gratuito de como estruturar',
  headline_highlight: 'marketing, comercial e vendas',
  headline_line3: 'do seu escritório',
  subheadline: 'Descubra em 2 minutos onde está o gargalo que trava o crescimento de seu escritório — e receba um plano personalizado no WhatsApp para parar de depender de indicação.',
  stat1_value: '9', stat1_label: 'Perguntas',
  stat2_value: '2min', stat2_label: 'Para concluir',
  stat3_value: '100%', stat3_label: 'Gratuito',
  cta_button_text: 'Começar diagnóstico',
  cta_subtext: 'Sem compromisso · Resultado imediato',
};

export default function Hero({ onStart }) {
  const [content, setContent] = useState(DEFAULT_CONTENT);

  useEffect(() => {
    let cancelled = false;
    homeContentApi.get()
      .then((data) => { if (!cancelled) setContent(data); })
      .catch(() => {}); // Requisito 3.1 — falha silenciosa, mantém o padrão
    return () => { cancelled = true; };
  }, []);

  // ...JSX troca os literais por content.badge_text, content.headline_line1,
  // content.headline_highlight, content.headline_line3, content.subheadline,
  // [{value: content.stat1_value, label: content.stat1_label}, ...],
  // content.cta_button_text, content.cta_subtext
}
```
Mesmo padrão de falha silenciosa já usado no `<MetaPixel/>` (Requisito 2.7
da spec [[whatsapp-pixel-meta-textos-hero]]) — a Home nunca quebra por causa
desta busca.

**Novo painel admin `src/pages/Admin/ConteudoPanel.jsx`** (não entra em
`IntegracoesPanel.jsx` — é conteúdo de página, não uma integração externa):
- Estado: `content` (salvo), `form` (edição), `saving`, `saved`, `error`.
- Um campo por texto (Requisito 3.2), com placeholder = valor padrão quando
  vazio.
- **Preview ao vivo** (Requisito 3.5): uma versão reduzida do bloco do Hero
  (mesmo fundo escuro/dourado, mesma hierarquia — selo, headline com o
  trecho destacado, subheadline, 3 stats, botão + legenda), renderizada a
  partir de `form`, recalculada a cada `onChange` — reaproveita as mesmas
  cores (`#0D0D17`, `#A08A4E`) já usadas em `Hero.jsx`, sem reimportar o
  componente inteiro (o preview é uma versão simplificada, não o `<Hero/>`
  real, para não precisar da prop `onStart`/scroll da página completa).
- Botão "Salvar textos" + "Restaurar todos os padrões" (chama
  `homeContentApi.save()` com todos os campos vazios).

**`Sidebar.jsx`** — novo item de navegação "Conteúdo" (ícone de
documento/texto), entre "Perguntas" e "Integrações".

**`AdminPanel.jsx`** — `renderPanel()` ganha `if (tab === 'conteudo') return <ConteudoPanel />;`.

---

## Alterações por arquivo (resumo)

| Arquivo | Mudança |
|---|---|
| `backend/app/Services/WhatsApp/WhatsAppProviderInterface.php` | +1 método `disconnect()` |
| `backend/app/Services/WhatsApp/EvolutionProvider.php` | +`disconnect()` (logout da instância) |
| `backend/app/Services/WhatsApp/OfficialCloudApiProvider.php` | +`disconnect()` (apaga credenciais) |
| `backend/app/Http/Controllers/WhatsAppController.php` | +action `disconnect()` |
| `backend/database/migrations/..._create_ai_prompt_settings_table.php` | novo |
| `backend/database/migrations/..._create_home_content_settings_table.php` | novo |
| `backend/app/Models/AiPromptSetting.php` | novo |
| `backend/app/Models/HomeContentSetting.php` | novo |
| `backend/app/Http/Controllers/AiPromptSettingController.php` | novo |
| `backend/app/Http/Controllers/HomeContentController.php` | novo |
| `backend/app/Services/AI/PromptBuilder.php` | template vira constante `DEFAULT_PROMPT_TEMPLATE` + `strtr()` a partir de `AiPromptSetting::current()` |
| `backend/routes/api.php` | +1 rota admin (`POST /whatsapp/disconnect`); +4 rotas admin (`GET/PUT /ai-prompt-settings`, `PUT /home-content`); +1 rota pública (`GET /home-content`) |
| `src/services/api.js` | `whatsappApi.disconnect()`; novos grupos `aiPromptSettingsApi`, `homeContentApi` |
| `src/pages/Admin/IntegracoesPanel.jsx` | botão "Desconectar" + modal de confirmação; novo card "Prompt da IA" |
| `src/pages/Admin/ConteudoPanel.jsx` | novo — edição dos textos da Home com preview |
| `src/pages/Admin/Sidebar.jsx` | novo item de navegação "Conteúdo" |
| `src/pages/Admin/AdminPanel.jsx` | roteia a tab `conteudo` para `ConteudoPanel` |
| `src/components/Hero.jsx` | literais viram `content.*`, buscado via `homeContentApi.get()` no mount |

## Casos de borda considerados

| Cenário | Comportamento |
|---|---|
| Admin desconecta a Evolution sem nunca ter conectado (instância inexistente) | `disconnect()` recebe 404 da Evolution API e trata como sucesso — já está desconectado, idempotente. |
| Admin desconecta a API oficial | Token/IDs apagados; próxima tentativa de envio falha como "não configurada", igual a uma instalação nova — nenhum crash. |
| Admin clica "Desconectar" duas vezes rápido | Segundo clique não tem efeito adicional prático (idempotente nos dois providers); botão fica desabilitado enquanto `disconnecting` é `true`, mitigando duplo clique. |
| Admin nunca configurou o prompt customizado | `buildPrompt()` usa `DEFAULT_PROMPT_TEMPLATE` — comportamento idêntico ao atual. |
| Admin digita um template sem nenhuma variável | `strtr` não substitui nada — prompt enviado literal; válido (ex. quer testar um prompt fixo). |
| Template do prompt com chave desconhecida (ex. `{empresa}`) | `strtr` não reconhece — texto `{empresa}` vai literal ao prompt; mesma decisão já aceita para a mensagem do WhatsApp (sem validação de variáveis desconhecidas). |
| `home-content` nunca configurado | `resolved()` devolve só os `DEFAULTS` — Home idêntica à atual. |
| Endpoint `/home-content` fora do ar ou lento | `.catch(() => {})` silencioso — Hero renderiza com `DEFAULT_CONTENT` já no estado inicial, sem esperar a resposta. |
| Admin limpa só 1 dos 13 campos do Home Content e salva | Só aquele campo volta ao padrão — os outros 12 mantêm o valor customizado (`$request->has($field)` por campo, não um "tudo ou nada"). |
| Admin edita o prompt para pedir Markdown em vez de HTML | PDF pode renderizar o texto literal (sem formatação rica), mas não quebra — mesmo comportamento de hoje se a IA já devolvesse algo fora do esperado; fora de escopo tratar/validar a saída da IA. |

## Por que `disconnect()` não existe hoje e por que não reaproveitar `updateSettings()`

`WhatsAppController::updateSettings()` já permite, na prática, "invalidar"
a API oficial salvando um token vazio/errado — mas isso exige o admin
sobrescrever cada campo manualmente e não dá nenhum feedback de que a
intenção era desconectar (vs. uma tentativa de configurar errada). Um botão
dedicado (Requisito 1) tem semântica clara, é reversível de forma óbvia
("Conectar" de novo) e cobre também a Evolution, onde não existe um
"campo" para limpar — só uma sessão para encerrar via API. Daí a escolha de
um método novo na interface (`disconnect()`) em vez de estender
`updateSettings()`.
