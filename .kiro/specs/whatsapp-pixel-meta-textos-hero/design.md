# Design — Mensagem do WhatsApp configurável, Pixel da Meta e novos textos da Home

## Visão geral

Três mudanças independentes, sem dependência entre si:

```
Requisito 1 (msg WhatsApp)     Requisito 2 (Pixel Meta)        Requisito 3 (textos Home)
─────────────────────────      ─────────────────────────       ─────────────────────────
message_settings (tabela)      pixel_settings (tabela)          Hero.jsx (edição direta)
  ↕ admin only                   ↕ GET público / PUT admin       nenhuma tabela, nenhum
MessageSettingController         PixelSettingController          endpoint, nenhum estado
  ↕                               ↕
DiagnosticReportService        <MetaPixel /> (novo componente,
  ::deliverViaWhatsApp()         montado só em Landing.jsx)
```

Requisitos 1 e 2 replicam exatamente o padrão já estabelecido no projeto para
"valor configurável sem deploy": tabela singleton (`firstOrCreate(['id'=>1])`),
controller com `index`/`show` + `update`, card novo em `IntegracoesPanel.jsx`.
A diferença entre os dois é só **onde o dado é sensível**: a mensagem do
WhatsApp não é secreta mas também não precisa ser pública (só o backend
consome); o Pixel ID não é secreto e **precisa** ser público (o navegador do
lead precisa lê-lo) — por isso segue o padrão do Calendly
(`CalendlySetting`/`CalendlySettingController`), não o padrão do WhatsApp
Token/OpenAI key (que são mascarados).

## Requisito 1 — Mensagem do WhatsApp

### Backend

**Migração `create_message_settings_table`:**
```php
Schema::create('message_settings', function (Blueprint $table) {
    $table->id();
    $table->text('whatsapp_message_template')->nullable();
    $table->timestamps();
});
```
Sem seed — ao contrário da spec [[openai-key-configuravel-admin]], não há
nenhum valor de `.env` a migrar; o fallback já vive em código (constante),
então a tabela pode nascer vazia sem nenhuma janela de indisponibilidade.

**Model `app/Models/MessageSetting.php`:**
```php
class MessageSetting extends Model
{
    protected $fillable = ['whatsapp_message_template'];

    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1]);
    }
}
```

**`DiagnosticReportService` — nova constante + `deliverViaWhatsApp` atualizado:**
```php
public const DEFAULT_WHATSAPP_TEMPLATE =
    "Olá, *{nome}*! 👋\n\nSeu diagnóstico comercial está pronto. Você alcançou *{pontuacao}/100 pontos* — nível *{nivel}*.\n\nSegue em anexo seu relatório personalizado com o plano de crescimento. Nossa equipe entrará em contato em breve! 🚀";

public function deliverViaWhatsApp(string $phone, string $name, int $score, string $level, string $base64Pdf, string $filename): array
{
    try {
        $template = MessageSetting::current()->whatsapp_message_template ?: self::DEFAULT_WHATSAPP_TEMPLATE;
        $message  = strtr($template, [
            '{nome}'      => $name,
            '{pontuacao}' => (string) $score,
            '{nivel}'     => $level,
        ]);

        $this->whatsapp->sendText($phone, $message);

        // Legenda do PDF continua fixa — Requisito 1.7
        $sent = $this->whatsapp->sendDocument($phone, $base64Pdf, $filename, '📊 Diagnóstico Comercial G4 Business');

        return [$sent, $sent ? null : 'O provider de WhatsApp recusou o envio.'];
    } catch (\Throwable $e) {
        return [false, $e->getMessage()];
    }
}
```
`strtr` (não `str_replace` com preg) é suficiente e mais seguro aqui: não há
regex, então um `{` literal digitado pelo admin não quebra nada.

**Controller `app/Http/Controllers/MessageSettingController.php`** (admin only,
sem rota pública — só o backend consome o template):
```php
class MessageSettingController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'whatsapp_message_template' => MessageSetting::current()->whatsapp_message_template,
            'whatsapp_message_default'  => DiagnosticReportService::DEFAULT_WHATSAPP_TEMPLATE,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'whatsapp_message_template' => 'nullable|string|max:4096',
        ]);

        $settings = MessageSetting::current();
        $settings->whatsapp_message_template = $data['whatsapp_message_template'] ?: null;
        $settings->save();

        return response()->json([
            'whatsapp_message_template' => $settings->whatsapp_message_template,
            'whatsapp_message_default'  => DiagnosticReportService::DEFAULT_WHATSAPP_TEMPLATE,
        ]);
    }
}
```
Devolver sempre `whatsapp_message_default` junto permite ao frontend mostrar
o padrão como placeholder/preview sem duplicar a string em JS.

**Rotas**, dentro do grupo `auth:api`/`prefix('admin')` já existente:
```php
Route::get('/message-settings', [MessageSettingController::class, 'index']);
Route::put('/message-settings', [MessageSettingController::class, 'update']);
```

### Frontend

**`src/services/api.js` — novo grupo `messageSettingsApi`:**
```js
export const messageSettingsApi = {
  async getSettings() {
    return request('/admin/message-settings');
  },
  async saveSettings(whatsapp_message_template) {
    return request('/admin/message-settings', {
      method: 'PUT',
      body: JSON.stringify({ whatsapp_message_template }),
    });
  },
};
```

**`IntegracoesPanel.jsx` — novo card "Mensagem do WhatsApp"**, mesmo padrão
visual dos cards existentes (Calendly, IA):
- Estado: `messageSettings` (dado salvo), `messageForm` (textarea), `savingMessage`, `messageSaved`, `messageError`.
- `messageSettingsApi.getSettings()` entra no `Promise.all` de `loadAll()`.
- `<textarea>` com `value={messageForm}`, `placeholder={messageSettings?.whatsapp_message_default}` quando vazio.
- Bloco de ajuda listando as variáveis disponíveis: `{nome}`, `{pontuacao}`, `{nivel}`.
- **Preview ao vivo** (Requisito 1.5): abaixo do textarea, um bloco somente-leitura
  que renderiza `(messageForm || messageSettings?.whatsapp_message_default)` com
  `{nome}/{pontuacao}/{nivel}` trocados por valores de exemplo fixos no
  frontend (`'João Silva'`, `82`, `'Em Transição'`), recalculado a cada
  `onChange` — troca client-side pura, sem chamada de API.
- Contador de caracteres (`messageForm.length / 4096`), texto em vermelho se ultrapassar.
- Botão "Salvar mensagem" (desabilitado se ultrapassar 4096); botão secundário
  "Restaurar padrão" que limpa o textarea e chama `saveSettings('')` direto
  (aciona o fallback do Requisito 1.4).

## Requisito 2 — Pixel da Meta

### Backend

**Migração `create_pixel_settings_table`:**
```php
Schema::create('pixel_settings', function (Blueprint $table) {
    $table->id();
    $table->string('meta_pixel_id')->nullable();
    $table->timestamps();
});
```

**Model `app/Models/PixelSetting.php`** — idêntico em forma a `CalendlySetting`:
```php
class PixelSetting extends Model
{
    protected $fillable = ['meta_pixel_id'];

    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1]);
    }
}
```

**Controller `app/Http/Controllers/PixelSettingController.php`:**
```php
class PixelSettingController extends Controller
{
    /** Leitura pública — consumida pelo <MetaPixel/> no site e pelo admin para pré-preencher o form */
    public function show(): JsonResponse
    {
        return response()->json(['meta_pixel_id' => PixelSetting::current()->meta_pixel_id]);
    }

    /** Atualiza o Pixel ID (admin). Vazio = desativa o pixel (Requisito 2.3) */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'meta_pixel_id' => 'nullable|string|regex:/^\d+$/|max:32',
        ]);

        $settings = PixelSetting::current();
        $settings->meta_pixel_id = $data['meta_pixel_id'] ?: null;
        $settings->save();

        return response()->json(['meta_pixel_id' => $settings->meta_pixel_id]);
    }
}
```

**Rotas** — pública junto das outras (`GET /pixel-settings`), admin dentro do
grupo já existente:
```php
// pública
Route::get('/pixel-settings', [PixelSettingController::class, 'show']);
// admin
Route::put('/admin/pixel-settings', [PixelSettingController::class, 'update']);
```

### Frontend

**`src/services/api.js` — novo grupo `pixelSettingsApi`:**
```js
export const pixelSettingsApi = {
  async get() {
    return request('/pixel-settings');
  },
  async save(meta_pixel_id) {
    return request('/admin/pixel-settings', {
      method: 'PUT',
      body: JSON.stringify({ meta_pixel_id }),
    });
  },
};
```

**Novo componente `src/components/MetaPixel.jsx`** — encapsula o bootstrap
do pixel, sem nenhuma UI (`return null`):
```jsx
import { useEffect } from 'react';
import { pixelSettingsApi } from '../services/api';

export default function MetaPixel() {
  useEffect(() => {
    let cancelled = false;

    pixelSettingsApi.get()
      .then(({ meta_pixel_id }) => {
        if (cancelled || !meta_pixel_id || window.fbq) return;

        // Snippet padrão do Meta Pixel (bootstrap oficial)
        (function (f, b, e, v, n, t, s) {
          if (f.fbq) return;
          n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
          if (!f._fbq) f._fbq = n;
          n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
          t = b.createElement(e); t.async = true; t.src = v;
          s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
        })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

        window.fbq('init', meta_pixel_id);
        window.fbq('track', 'PageView');
      })
      .catch(() => {}); // Requisito 2.7 — falha silenciosa, não quebra a Home

    return () => { cancelled = true; };
  }, []);

  return null;
}
```

**`Landing.jsx`:**
- Renderiza `<MetaPixel />` incondicionalmente no topo do componente (fora do
  `if (view === ...)` que troca as telas internas) — `Landing` fica montado
  durante toda a navegação Hero→Quiz→...→ThankYou (mesmo comportamento já
  documentado na spec [[pdf-somente-whatsapp]]), então o pixel carrega e
  dispara `PageView` **uma única vez** por visita, não a cada troca de tela.
- Dentro de `handleLeadSubmit`, logo após `leadsApi.submit(...)` resolver com
  sucesso: `window.fbq && window.fbq('track', 'Lead');` (Requisito 2.5).

**`AdminPanel.jsx`:** nenhuma mudança — `<MetaPixel />` nunca é importado/
renderizado ali, satisfazendo o Requisito 2.6 por construção (não por uma
checagem de rota em runtime).

## Requisito 3 — Textos da Home

Edição direta, sem nova infraestrutura. Em `src/components/Hero.jsx`:

```diff
  <h1 ...>
-   Descubra o nível de
-   <br />
-   <span style={{ color: '#A08A4E' }}>maturidade comercial</span>
-   <br />
-   da sua empresa
+   Diagnóstico gratuito de como estruturar
+   <br />
+   <span style={{ color: '#A08A4E' }}>marketing, comercial e vendas</span>
+   <br />
+   do seu escritório
  </h1>

  <p ...>
-   9 perguntas sobre como sua empresa gera e converte clientes. Receba o
-   resultado e um plano personalizado no WhatsApp.
+   Descubra em 2 minutos onde está o gargalo que trava o crescimento de seu
+   escritório — e receba um plano personalizado no WhatsApp para parar de
+   depender de indicação.
+ </p>
```
A quebra do `<h1>` em `<br/>`+`<span>` é reaproveitada (só o texto muda) para
manter o destaque em dourado (`#A08A4E`) numa parte do headline, como já
acontece hoje — a task de implementação decide o ponto de quebra mais
equilibrado visualmente (ex. destacar "marketing, comercial e vendas").

Selo (linha 86) e stats (linhas 138-142) **não são tocados** — já batem com o
texto pedido (ver `requirements.md`, Requisito 3.3-3.4).

## Alterações por arquivo (resumo)

| Arquivo | Mudança |
|---|---|
| `backend/database/migrations/..._create_message_settings_table.php` | novo |
| `backend/database/migrations/..._create_pixel_settings_table.php` | novo |
| `backend/app/Models/MessageSetting.php` | novo |
| `backend/app/Models/PixelSetting.php` | novo |
| `backend/app/Http/Controllers/MessageSettingController.php` | novo |
| `backend/app/Http/Controllers/PixelSettingController.php` | novo |
| `backend/app/Services/DiagnosticReportService.php` | nova constante `DEFAULT_WHATSAPP_TEMPLATE`; `deliverViaWhatsApp()` passa a montar a mensagem a partir de `MessageSetting::current()` |
| `backend/routes/api.php` | +1 rota pública (`GET /pixel-settings`) e +4 rotas admin (`GET/PUT /admin/message-settings`, `PUT /admin/pixel-settings`) |
| `src/services/api.js` | novos grupos `messageSettingsApi`, `pixelSettingsApi` |
| `src/pages/Admin/IntegracoesPanel.jsx` | +2 cards: "Mensagem do WhatsApp" (com preview) e "Pixel da Meta" |
| `src/components/MetaPixel.jsx` | novo — componente sem UI, injeta o snippet do pixel |
| `src/pages/Landing.jsx` | renderiza `<MetaPixel/>`; dispara `fbq('track','Lead')` após `leadsApi.submit` |
| `src/components/Hero.jsx` | headline e subheadline substituídos (texto apenas) |

## Casos de borda considerados

| Cenário | Comportamento |
|---|---|
| Admin nunca configurou a mensagem do WhatsApp | `deliverViaWhatsApp` usa `DEFAULT_WHATSAPP_TEMPLATE` — comportamento idêntico ao atual, sem nenhuma mudança perceptível. |
| Admin salva a mensagem em branco depois de já ter customizado | Volta a usar o padrão embutido — funciona como "resetar" (Requisito 1.4). |
| Admin digita um template sem nenhuma das 3 variáveis | `strtr` simplesmente não substitui nada — mensagem enviada literal, sem erro. Válido (ex.: admin quer texto fixo sem personalização). |
| Template com chave desconhecida, ex. `{empresa}` | `strtr` não reconhece `{empresa}` como chave mapeada — texto `{empresa}` é enviado literalmente ao lead. Nenhuma validação de "variáveis desconhecidas" nesta spec (poderia ser um aviso no preview, listado como melhoria não-crítica em `tasks.md`). |
| Pixel ID nunca configurado | `<MetaPixel/>` recebe `meta_pixel_id: null`, não injeta nada — nenhum script de terceiro carrega, sem custo de performance. |
| Endpoint `/pixel-settings` fora do ar ou lento | `.catch(() => {})` silencioso — Home segue funcionando normalmente, só sem tracking (Requisito 2.7). |
| Lead reenvia o formulário (não deveria, mas por segurança) | `fbq('track','Lead')` dispara de novo — aceitável, é o mesmo comportamento que qualquer site com pixel teria em um reenvio manual. |
| Admin troca o Pixel ID enquanto um visitante já está com a Home aberta | Sem efeito até o visitante recarregar a página — `<MetaPixel/>` só busca o ID uma vez, no mount (`useEffect` com array de dependências vazio); comportamento aceitável, igual ao Calendly. |

## Por que não usar Google Tag Manager como camada intermediária

Injetar o Pixel diretamente (em vez de via GTM) foi escolhido porque: (1) não
existe GTM no projeto hoje e adicioná-lo seria escopo maior que o pedido
("configurar o pixel meta"); (2) o pixel direto é mais simples de auditar e
de desativar (basta limpar o campo no admin); (3) GTM adiciona uma segunda
camada de configuração (o container do GTM em si) que teria que morar em
algum lugar — fora de escopo por decisão confirmada com o usuário.
