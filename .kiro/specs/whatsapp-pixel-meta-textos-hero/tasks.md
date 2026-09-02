# Tasks — Mensagem do WhatsApp configurável, Pixel da Meta e novos textos da Home

Convenção: cada task referencia os critérios de aceite de `requirements.md`
que ela implementa (ex. `[R1.1]`).

## Fase 1 — Backend: Mensagem do WhatsApp (Requisito 1)

- [x] 1.1 Migração `create_message_settings_table` (`whatsapp_message_template` nullable) `[R1.1]`
- [x] 1.2 Model `app/Models/MessageSetting.php` (`current()` singleton) `[R1.1]`
- [x] 1.3 `DiagnosticReportService`: adicionar `public const DEFAULT_WHATSAPP_TEMPLATE` com o texto atual `[R1.4]`
- [x] 1.4 `DiagnosticReportService::deliverViaWhatsApp()`: montar a mensagem via
      `MessageSetting::current()->whatsapp_message_template ?: self::DEFAULT_WHATSAPP_TEMPLATE`
      + `strtr` com `{nome}`/`{pontuacao}`/`{nivel}` `[R1.2, R1.3, R1.4]`
- [x] 1.5 `MessageSettingController::index()` — devolve template salvo + `whatsapp_message_default` `[R1.1]`
- [x] 1.6 `MessageSettingController::update()` — valida `max:4096`, vazio salva `null` `[R1.2, R1.6]`
- [x] 1.7 Rotas `GET/PUT /admin/message-settings` no grupo `auth:api`/`prefix('admin')` `[R1.1, R1.2]`

## Fase 2 — Backend: Pixel da Meta (Requisito 2)

- [x] 2.1 Migração `create_pixel_settings_table` (`meta_pixel_id` nullable) `[R2.1]`
- [x] 2.2 Model `app/Models/PixelSetting.php` (`current()` singleton) `[R2.1]`
- [x] 2.3 `PixelSettingController::show()` — pública, devolve `meta_pixel_id` `[R2.1, R2.8]`
- [x] 2.4 `PixelSettingController::update()` — valida string numérica, vazio salva `null` `[R2.2, R2.3]`
- [x] 2.5 Rota pública `GET /pixel-settings` (junto de `/questions`, `/calendly-settings`) `[R2.8]`
- [x] 2.6 Rota admin `PUT /admin/pixel-settings` `[R2.2]`

## Fase 3 — Frontend: Mensagem do WhatsApp

- [x] 3.1 `src/services/api.js`: grupo `messageSettingsApi` (`getSettings`, `saveSettings`) `[R1.1, R1.2]`
- [x] 3.2 `IntegracoesPanel.jsx`: novo card "Mensagem do WhatsApp" — textarea +
      contador de caracteres + lista de variáveis disponíveis `[R1.1, R1.6]`
- [x] 3.3 `IntegracoesPanel.jsx`: preview ao vivo (client-side, valores de
      exemplo) abaixo do textarea, recalculado a cada `onChange` `[R1.5]`
- [x] 3.4 `IntegracoesPanel.jsx`: botão "Salvar mensagem" (desabilitado acima
      de 4096 caracteres) + botão "Restaurar padrão" (`saveSettings('')`) `[R1.2, R1.4, R1.6]`

## Fase 4 — Frontend: Pixel da Meta

- [x] 4.1 `src/services/api.js`: grupo `pixelSettingsApi` (`get`, `save`) `[R2.1, R2.2]`
- [x] 4.2 `IntegracoesPanel.jsx`: novo card "Pixel da Meta" — campo de texto +
      botão salvar, mesmo padrão visual dos outros cards `[R2.1, R2.2, R2.3]`
- [x] 4.3 Novo componente `src/components/MetaPixel.jsx` (sem UI) — busca o
      Pixel ID, injeta o snippet oficial e dispara `PageView` `[R2.4, R2.7]`
- [x] 4.4 `Landing.jsx`: renderizar `<MetaPixel/>` incondicionalmente no topo
      do componente (fora da troca de `view`) `[R2.4, R2.6]`
- [x] 4.5 `Landing.jsx::handleLeadSubmit`: disparar `fbq('track','Lead')`
      após `leadsApi.submit` resolver com sucesso `[R2.5]`

## Fase 5 — Textos da Home (Requisito 3)

- [x] 5.1 `Hero.jsx`: substituir o headline pelo novo texto `[R3.1]`
- [x] 5.2 `Hero.jsx`: substituir o subheadline pelo novo texto `[R3.2]`
- [x] 5.3 Conferir que selo e stats permanecem exatamente como hoje `[R3.3, R3.4, R3.5]`
      — confirmado por leitura do `Hero.jsx` final: nenhuma linha do selo/stats
      foi tocada. Conferência visual no navegador não executada (ver 6.8).

## Fase 6 — Validação manual

- [x] 6.1 Rodar as migrações novas em ambiente de desenvolvimento — ambas
      criadas com sucesso (`php artisan migrate --path=...`) `[R1.1, R2.1]`
- [x] 6.2 Confirmar que a mensagem final usa `{nome}`/`{pontuacao}`/`{nivel}`
      substituídos corretamente — validado via `php artisan tinker`
      reproduzindo a lógica de `deliverViaWhatsApp()` (fallback + `strtr`),
      saída conferida caractere a caractere `[R1.2, R1.3]`
      — **não executado via envio real**: exige um provider de WhatsApp
      conectado (Evolution/API oficial), indisponível neste ambiente. Mesma
      limitação já registrada na spec [[pdf-somente-whatsapp]].
- [x] 6.3 Confirmar que template vazio cai no padrão — validado no mesmo teste
      do tinker (`MessageSetting::current()->whatsapp_message_template` é
      `null` por padrão → usa `DEFAULT_WHATSAPP_TEMPLATE`) `[R1.4]`
- [x] 6.4 Confirmar rejeição de template > 4096 caracteres e de Pixel ID não
      numérico — validado via `Validator::make(...)` no tinker com as mesmas
      regras dos controllers: ambos falham como esperado; Pixel ID numérico
      válido passa `[R1.6, R2.2]`
- [ ] 6.5 Configurar um Pixel ID de teste no admin, abrir a Home em aba anônima
      e confirmar no Meta Events Manager (ou na aba Network) que `PageView`
      dispara ao carregar e `Lead` dispara ao concluir o formulário `[R2.2, R2.4, R2.5]`
      — **não executado**: exige app rodando no navegador + uma conta real
      da Meta com Pixel de teste, indisponível neste ambiente.
- [ ] 6.6 Limpar o Pixel ID e confirmar que nenhum script do Facebook é
      carregado na Home `[R2.3]`
      — **não executado**, mesmo motivo acima.
- [x] 6.7 Garantir que `/admin/*` nunca carrega o Pixel — confirmado
      estruturalmente: `MetaPixel` só é importado/renderizado em `Landing.jsx`
      (`grep -r "MetaPixel" src/` só retorna `MetaPixel.jsx`, `Landing.jsx` e
      um comentário em `api.js`) — `AdminPanel.jsx`/`IntegracoesPanel.jsx`/
      `Sidebar.jsx` não o referenciam `[R2.6]`
- [ ] 6.8 Conferir visualmente a Home (mobile e desktop) com os novos
      headline/subheadline — sem overflow/quebra de linha estranha `[R3.1, R3.2]`
      — **não executado**: exige subir o dev server e abrir no navegador;
      risco visual considerado baixo (mudança é só de texto, mesma estrutura/
      CSS do `<h1>`/`<p>` já existentes, que já usam `clamp()`/`textWrap:
      balance` para se adaptar a qualquer comprimento de texto).
- [x] 6.9 `npx vite build` e `npx oxlint` na raiz do projeto — ambos limpos,
      sem erros/avisos novos (1 aviso de lint encontrado e corrigido em
      `MetaPixel.jsx`, ternário-como-statement trocado por `if/else`).

---

## Notas

- Nenhuma mudança em `WhatsAppProviderInterface`, `EvolutionProvider`,
  `OfficialCloudApiProvider` ou `GenerateDiagnosticReportJob` — confirmado no
  Requisito 1.8 e no `design.md`.
- `Masks::last4()` (`backend/app/Support/Masks.php`) não é usado nesta spec —
  nem a mensagem do WhatsApp nem o Pixel ID são dados sensíveis que precisem
  de mascaramento.
- Esta spec assume o padrão de card em `IntegracoesPanel.jsx` já estabelecido
  pelas specs [[calendly-configuravel-admin]] e [[openai-key-configuravel-admin]].
- Cache de rotas do Laravel (`bootstrap/cache/routes-v7.php`) estava
  desatualizado neste ambiente (de antes desta sessão) e escondia as rotas
  novas de `php artisan route:list`; resolvido com `php artisan route:clear`.
  Vale lembrar disso em produção também: qualquer deploy que rode
  `route:cache` precisa rodar de novo após este merge.
