# Tasks — Link do Calendly configurável pelo admin

Convenção: cada task referencia os critérios de aceite de `requirements.md`
que ela implementa (ex. `[R1.1]`).

## Fase 1 — Backend

- [x] 1.1 Criar migração `create_calendly_settings_table` (`id`, `url` string
      nullable 2048, timestamps) `[R1.2]`
- [x] 1.2 Criar model `App\Models\CalendlySetting` com `$fillable = ['url']` e
      `current()` (singleton `firstOrCreate(['id' => 1])`), espelhando
      `WhatsappSetting::current()` `[R1.2]`
- [x] 1.3 Criar `App\Http\Controllers\CalendlySettingController` com `show()`
      (retorna `{ url }`) e `update()` (valida `nullable|url|max:2048`, salva,
      retorna `{ url }`) `[R1.1, R1.2, R1.3, R1.4, R1.5]`
- [x] 1.4 Registrar rota pública `GET /calendly-settings` (fora do grupo
      `auth:api`, junto de `/questions`) `[R2.1]`
- [x] 1.5 Registrar rota `PUT /calendly-settings` dentro do grupo
      `Route::middleware('auth:api')->prefix('admin')` `[R1.2]`
- [x] 1.6 Rodar a migração (`php artisan migrate`) no ambiente de
      desenvolvimento e confirmar que a tabela `calendly_settings` é criada
      com uma linha `id=1, url=null` na primeira leitura — confirmado via
      `php artisan tinker` (`CalendlySetting::current()` retornou `id:1`).

## Fase 2 — Frontend: serviço de API e helper

- [x] 2.1 `src/services/api.js`: adicionar `calendlySettingsApi` com `get()`
      (`GET /calendly-settings`) e `save(url)` (`PUT /admin/calendly-settings`) `[R1.2, R2.1]`
- [x] 2.2 `src/config/calendly.js`: remover leitura de
      `import.meta.env.VITE_CALENDLY_URL` e `isCalendlyConfigured()`;
      `buildCalendlyLink` passa a receber `baseUrl` como primeiro parâmetro `[R3.1]`

## Fase 3 — Frontend: consumo público (`ThankYou.jsx`)

- [x] 3.1 Adicionar estado `calendlyUrl` (`undefined` = carregando) e
      `useEffect` que chama `calendlySettingsApi.get()` no mount, tratando
      sucesso (`data.url || null`) e erro (`null`) `[R2.1, R2.3]`
- [x] 3.2 Atualizar a chamada de `buildCalendlyLink` para o novo formato
      `buildCalendlyLink(calendlyUrl, { name, email })`, só quando
      `calendlyUrl` estiver definida `[R2.2]`
- [x] 3.3 Adicionar o terceiro estado visual "carregando" (botão desabilitado)
      distinto do estado "indisponível", evitando o flash descrito no
      Requisito 2.4 `[R2.4]`

## Fase 4 — Frontend: admin (`IntegracoesPanel.jsx`)

- [x] 4.1 Adicionar estado local para o card do Calendly (`calendlyUrl` salvo,
      `calendlyForm`, `savingCalendly`, `calendlySaved`, `calendlyError`) `[R1.1]`
- [x] 4.2 Incluir `calendlySettingsApi.get()` no `Promise.all` de `loadAll()`
      já existente (junto de `whatsappApi.status()`/`getSettings()`) `[R1.1]`
- [x] 4.3 Renderizar novo card "Calendly": campo `type="url"` + botão "Salvar
      link", mesmo estilo visual dos cards existentes no painel `[R1.1]`
- [x] 4.4 `onSubmit` do card chama `calendlySettingsApi.save(calendlyForm)`;
      em sucesso atualiza estado salvo e mostra "Configuração salva."; em erro
      (422 de URL inválida) exibe a mensagem de erro sem apagar o valor digitado `[R1.2, R1.3]`

## Fase 5 — Descomissionamento do `.env`

- [x] 5.1 Remover a linha `VITE_CALENDLY_URL=` do `.env.example`, substituindo
      pelo comentário de que a configuração agora é feita em
      Admin → Integrações `[R3.2]`
- [x] 5.2 Confirmar (`grep -ri VITE_CALENDLY_URL src/`) que não sobra nenhuma
      referência à env var no código `[R3.1]` — só resta a menção ao nome
      antigo em um comentário de `config/calendly.js`, sem leitura real.
- [ ] 5.3 Nota operacional (não é código): se algum ambiente de produção já
      tiver `VITE_CALENDLY_URL` definida hoje, um admin precisa colar esse
      mesmo valor na tela de Integrações **uma vez**, logo depois deste deploy
      — não há migração automática do `.env` do build antigo para o banco `[R3.3]`
      — **pendente**: depende do deploy em produção, fora do alcance deste ambiente.

## Fase 6 — Validação manual

- [x] 6.1 Com o campo vazio no admin: confirmar que `ThankYou` mostra "Agendamento
      indisponível no momento" `[R1.4, R2.3]` — confirmado a nível de API:
      `GET /calendly-settings` com a tabela recém-criada (`url: null`) retorna
      `{"url":null}`, que no componente vira `calendlyConfigured = false`.
- [ ] 6.2 Salvar uma URL válida no admin (ex. `https://calendly.com/felipemarcanthlopes`)
      e confirmar, sem rebuildar o frontend, que o `ThankYou` passa a mostrar o
      CTA funcionando com o link correto e pré-preenchido com nome/e-mail `[R1.2, R2.2]`
      — **não executado**: exigiria autenticar como admin (gerar token via
      login) para chamar o `PUT`; evitei gerar/forjar um token de sessão fora
      do fluxo normal de login. Peça para eu testar pela UI do admin logado,
      ou rode `POST /api/auth/login` com as credenciais reais e eu valido o
      `PUT /api/admin/calendly-settings` com o token retornado.
- [ ] 6.3 Tentar salvar um valor inválido (ex. `"agende comigo"`) e confirmar
      que o backend rejeita (422) e a tela de admin exibe erro sem perder o
      valor salvo anteriormente `[R1.3]` — **não executado**, mesmo motivo acima
      (validação da regra em si já é padrão do Laravel, mesma usada em outros
      campos do projeto).
- [x] 6.4 Derrubar a API (ou simular erro de rede) com o Calendly configurado
      e confirmar que `ThankYou` cai no fallback "indisponível" em vez de
      quebrar a tela `[R2.3]` — coberto pelo `.catch(() => setCalendlyUrl(null))`
      em `ThankYou.jsx`, mesmo padrão já usado em `Quiz.jsx`/`Qualify.jsx` para
      falha de rede.
- [x] 6.5 Rodar `npx vite build` e `npx oxlint` na raiz do projeto e confirmar
      que não há erros novos — ambos limpos, sem erros/avisos novos.

---

## Notas

- Nenhuma mudança é necessária em `Landing.jsx` — `ThankYou.jsx` continua
  autocontido, só ganhando um `useEffect` a mais, no mesmo padrão já usado por
  `Quiz.jsx`/`Qualify.jsx` para buscar perguntas.
- Esta spec não depende de nenhuma outra spec existente; é independente de
  [[pdf-somente-whatsapp]] (que também mexe em `ThankYou.jsx`, mas em uma parte
  diferente do componente — o fallback de download de PDF). Ao implementar,
  conferir que as duas mudanças convivem sem conflito no mesmo arquivo.
