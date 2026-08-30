# Design — Link do Calendly configurável pelo admin

## Visão geral

Replica exatamente o padrão já usado para `WhatsappSetting` (model singleton +
controller com rota pública de leitura leve e rota admin autenticada para
escrita), com uma diferença: como o link do Calendly **não é sensível** (ao
contrário de um token de API), a leitura não precisa de autenticação — é
pública, do mesmo jeito que `GET /questions` já é.

```
Backend (Laravel)                          Frontend (React)
─────────────────                          ─────────────────
calendly_settings (tabela, 1 linha)   ←→   IntegracoesPanel.jsx (admin, escreve)
  id | url | timestamps                    ThankYou.jsx          (público, lê)
        ↑
CalendlySetting::current()
        ↑
CalendlySettingController
  show()    → GET  /calendly-settings           (público)
  update()  → PUT  /admin/calendly-settings     (auth:api)
```

## Backend

### Migração `create_calendly_settings_table`

Nova tabela singleton, mesmo padrão de `whatsapp_settings`:

```php
Schema::create('calendly_settings', function (Blueprint $table) {
    $table->id();
    $table->string('url', 2048)->nullable();
    $table->timestamps();
});
```

### Model `app/Models/CalendlySetting.php`

```php
class CalendlySetting extends Model
{
    protected $fillable = ['url'];

    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1]);
    }
}
```

### Controller `app/Http/Controllers/CalendlySettingController.php`

```php
class CalendlySettingController extends Controller
{
    /** Leitura pública — consumida pelo site (ThankYou.jsx) */
    public function show(): JsonResponse
    {
        return response()->json(['url' => CalendlySetting::current()->url]);
    }

    /** Atualização (admin) */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'url' => 'nullable|url|max:2048',
        ]);

        $settings = CalendlySetting::current();
        $settings->url = $data['url'] ?? null;
        $settings->save();

        return response()->json(['url' => $settings->url]);
    }
}
```

`'nullable|url'` cobre o Requisito 1.3/1.4/1.5: aceita vazio (desconfigura) e
qualquer URL válida (não trava em domínio `calendly.com`).

### Rotas (`routes/api.php`)

```php
// ── Rotas públicas ──
Route::get('/calendly-settings', [CalendlySettingController::class, 'show']);

// ── dentro do grupo auth:api / prefix('admin') ──
Route::put('/calendly-settings', [CalendlySettingController::class, 'update']);
```

Por que uma rota pública dedicada em vez de reaproveitar algo do
`WhatsAppController`: são domínios diferentes (Calendly ≠ WhatsApp), e por que
não colocar `show()` também atrás de `auth:api`: o `IntegracoesPanel` também
pode chamar a mesma rota pública para pré-preencher o formulário — não há
necessidade de uma segunda rota admin só de leitura, já que o dado não muda
conforme quem pergunta (ao contrário do token do WhatsApp, que é mascarado
para não-owners; aqui não há nada a mascarar).

## Frontend

### `src/services/api.js` — novo grupo `calendlySettingsApi`

```js
export const calendlySettingsApi = {
  /** Leitura pública — usada tanto pelo site quanto para pré-preencher o admin */
  async get() {
    return request('/calendly-settings');
  },

  /** Salva a URL (admin) */
  async save(url) {
    return request('/admin/calendly-settings', {
      method: 'PUT',
      body: JSON.stringify({ url }),
    });
  },
};
```

### `src/config/calendly.js` — vira uma função pura, sem ler `.env`

```js
/** Monta o link do Calendly pré-preenchido com nome/e-mail do lead, quando disponíveis. */
export function buildCalendlyLink(baseUrl, { name, email } = {}) {
  if (!baseUrl) return null;

  const params = new URLSearchParams();
  if (name)  params.set('name', name);
  if (email) params.set('email', email);

  const query = params.toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
}
```

`isCalendlyConfigured()` é removida — quem consome agora deriva isso de
`Boolean(url)` a partir do valor vindo da API.

### `src/components/ThankYou.jsx` — busca a URL no mount

Segue o mesmo padrão já usado em `Quiz.jsx`/`Qualify.jsx`
(`questionsApi.getAll()` num `useEffect` com estado local de loading/erro),
em vez de levantar isso para `Landing.jsx` — o componente fica autocontido.

```jsx
import { useEffect, useState } from 'react';
import { buildCalendlyLink } from '../config/calendly';
import { calendlySettingsApi, reportApi } from '../services/api';

export default function ThankYou({ name, email, reportResult }) {
  const [calendlyUrl, setCalendlyUrl] = useState(undefined); // undefined = carregando

  useEffect(() => {
    calendlySettingsApi.get()
      .then((data) => setCalendlyUrl(data.url || null))
      .catch(() => setCalendlyUrl(null)); // falha de rede = mesmo estado de "não configurado"
  }, []);

  const loadingCalendly     = calendlyUrl === undefined;
  const calendlyConfigured  = Boolean(calendlyUrl);
  const calendlyLink        = calendlyConfigured ? buildCalendlyLink(calendlyUrl, { name, email }) : null;

  // ...

  {loadingCalendly ? (
    <button type="button" className="cta-btn" disabled>Carregando...</button>
  ) : calendlyConfigured ? (
    <a href={calendlyLink} target="_blank" rel="noopener noreferrer" className="cta-btn">
      Quero analisar meu escritório
      {/* ...ícone svg existente... */}
    </a>
  ) : (
    <button type="button" className="cta-btn" disabled>
      Agendamento indisponível no momento
    </button>
  )}
```

Três estados (`undefined` / `null` / string) em vez de dois evita o "flash"
proibido pelo Requisito 2.4: sem isso, o botão nasceria como "indisponível" e
trocaria de texto assim que a resposta chegasse — visualmente ruim mesmo que
rápido.

### `src/pages/Admin/IntegracoesPanel.jsx` — novo card "Calendly"

Novo bloco abaixo do card de status do WhatsApp, seguindo exatamente o mesmo
visual dos outros cards do painel (`background: '#fff'`, borda, `field`,
`btn btn-accent`, mensagem "Configuração salva."):

- Estado próprio: `calendlyUrl` (valor salvo), `calendlyForm` (valor do input),
  `savingCalendly`, `calendlySaved`, `calendlyError` — mesmo padrão de
  `settings`/`form`/`savingSettings` já usado no card do WhatsApp acima.
- `useEffect` inicial chama `calendlySettingsApi.get()` (pode entrar no mesmo
  `Promise.all` de `loadAll()` já existente, junto com `whatsappApi.status()`
  e `whatsappApi.getSettings()`).
- Um único campo de texto (`type="url"`, placeholder
  `https://calendly.com/sua-empresa/evento`) + botão "Salvar link".
- `onSubmit` chama `calendlySettingsApi.save(calendlyForm)`; em caso de erro
  (ex. 422 de URL inválida), mostra a mensagem retornada pelo backend no mesmo
  estilo de erro já usado (`background: 'rgba(220,38,38,.06)'`).

## Alterações por arquivo (resumo)

| Arquivo | Mudança |
|---|---|
| `backend/database/migrations/..._create_calendly_settings_table.php` | novo |
| `backend/app/Models/CalendlySetting.php` | novo |
| `backend/app/Http/Controllers/CalendlySettingController.php` | novo |
| `backend/routes/api.php` | 2 rotas novas (`GET /calendly-settings` público, `PUT /admin/calendly-settings` admin) |
| `src/services/api.js` | novo grupo `calendlySettingsApi` (`get`, `save`) |
| `src/config/calendly.js` | `buildCalendlyLink` passa a receber `baseUrl` por parâmetro; remove leitura de `import.meta.env` e remove `isCalendlyConfigured` |
| `src/components/ThankYou.jsx` | busca a URL via `calendlySettingsApi.get()` no mount; 3 estados (carregando/configurado/indisponível) |
| `src/pages/Admin/IntegracoesPanel.jsx` | novo card "Calendly" com campo + salvar |
| `.env.example` | remove `VITE_CALENDLY_URL` (ou substitui por comentário apontando para o admin) |

## Casos de borda considerados

| Cenário | Comportamento |
|---|---|
| Calendly nunca configurado (banco com `url: null`) | `GET /calendly-settings` retorna `{ url: null }` → `ThankYou` mostra botão desabilitado, igual hoje. |
| Admin apaga o campo e salva | `PUT` recebe `url: ""` → `'nullable'` aceita, salva `null` → mesmo efeito do caso acima. |
| Falha de rede ao buscar no `ThankYou` (API fora do ar) | `catch` seta `calendlyUrl = null` → mesmo fallback de "indisponível", sem quebrar a tela. |
| Admin digita texto que não é URL (ex. "agende comigo") | Validação `url` do Laravel rejeita com 422 antes de salvar; valor anterior no banco não muda. |
| Duas abas do admin salvando ao mesmo tempo | Última escrita vence (mesmo comportamento de "singleton row" já aceito no `WhatsappSetting`, sem lock otimista — fora de escopo). |

## Por que não usar variável de ambiente no backend em vez de tabela

Poderia se pensar em mover `VITE_CALENDLY_URL` para uma env var *do backend*
(`CALENDLY_URL` no `.env` do Laravel) e servir isso por uma rota — resolveria
o problema do rebuild do *frontend*, mas ainda exigiria acesso ao servidor/.env
do backend e reiniciar o PHP-FPM para o admin trocar o link, o que não atende
ao Requisito 1.2 ("valer imediatamente, sem novo build **ou deploy**"). Banco
de dados é a única opção que dá autoatendimento real pelo painel, e já é o
padrão estabelecido pelo `WhatsappSetting` neste mesmo projeto.
