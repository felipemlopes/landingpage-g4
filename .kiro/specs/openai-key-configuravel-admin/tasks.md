# Tasks — API Key da OpenAI configurável pelo admin

Convenção: cada task referencia os critérios de aceite de `requirements.md`
que ela implementa (ex. `[R1.1]`). Implementado e validado em 2026-08-31.

## Fase 1 — Backend

- [x] 1.1 Criar migração `create_ai_settings_table` (`id`, `openai_api_key`
      text nullable, timestamps) que semeia a linha inicial com
      `env('OPENAI_API_KEY')` no próprio `up()` `[R2.1]`
- [x] 1.2 Criar model `App\Models\AiSetting` com `$fillable = ['openai_api_key']`
      e `current()` (singleton `firstOrCreate(['id' => 1])`), espelhando
      `WhatsappSetting::current()`/`CalendlySetting::current()` `[R1.2]`
- [x] 1.3 Criar `App\Http\Controllers\AiSettingController` com `index()`
      (retorna `openai_api_key_set` + `openai_api_key_masked`, nunca a key
      em texto puro) e `update()` (valida `nullable|string|max:255`, só
      sobrescreve quando o valor enviado não é vazio) `[R1.1, R1.2, R1.3, R1.4, R3.1]`
- [x] 1.4 Registrar `GET /ai-settings` e `PUT /ai-settings` dentro do grupo
      já existente `Route::middleware('auth:api')->prefix('admin')` `[R1.1, R1.2]`
      — confirmado com `php artisan route:list`.
- [x] 1.5 Atualizar `OpenAIService::__construct()` para ler
      `AiSetting::current()->openai_api_key`, com fallback
      `?: config('services.openai.key')` quando o banco estiver vazio `[R2.2]`
- [x] 1.6 Rodar a migração (`php artisan migrate`) em desenvolvimento e
      confirmar via `php artisan tinker` que `AiSetting::current()->openai_api_key`
      já veio preenchida a partir do `.env` local `[R2.1]` — confirmado.
- [x] 1.7 Confirmar que nenhum middleware/log de request registra o corpo do
      `PUT /admin/ai-settings` `[R3.2]` — conferido o `Kernel.php`: nenhum
      middleware de log de request está registrado, nem global nem no grupo
      `api`.

## Fase 2 — Frontend: serviço de API

- [x] 2.1 `src/services/api.js`: adicionar `aiSettingsApi` com `getSettings()`
      (`GET /admin/ai-settings`) e `saveSettings(openai_api_key)`
      (`PUT /admin/ai-settings`) `[R1.1, R1.2]`

## Fase 3 — Frontend: admin (`IntegracoesPanel.jsx`)

- [x] 3.1 Adicionar estado local para o card de IA (`aiSettings` salvo,
      `aiKeyForm`, `savingAi`, `aiSaved`, `aiError`) `[R1.1]`
- [x] 3.2 Incluir `aiSettingsApi.getSettings()` no `Promise.all` de `loadAll()`
      já existente, junto de `whatsappApi.status()`, `whatsappApi.getSettings()`
      e `calendlySettingsApi.get()` `[R1.1]`
- [x] 3.3 Renderizar novo card "IA (OpenAI)": campo `type="password"` com
      placeholder mascarado quando já configurada + texto "Já configurada.
      Deixe em branco para manter a chave atual." + botão "Salvar key",
      mesmo estilo visual dos cards existentes `[R1.1, R1.4]`
- [x] 3.4 Desabilitar o botão de salvar quando `aiKeyForm` está vazio, para
      não permitir uma submissão que o backend só vai ignorar `[R1.3]`
- [x] 3.5 `onSubmit` chama `aiSettingsApi.saveSettings(aiKeyForm)`; em
      sucesso, limpa o campo e mostra "Configuração salva."; em erro, exibe
      a mensagem retornada pelo backend, mesmo estilo de erro já usado nos
      outros cards `[R1.2]`

## Fase 4 — `.env.example`

- [x] 4.1 Atualizar o comentário acima de `OPENAI_API_KEY` em
      `backend/.env.example` explicando que ela agora é só o valor inicial/
      fallback (semeado na migração) — a fonte de verdade em produção passa
      a ser Admin → Integrações `[R2.1, R2.2]`

## Fase 5 — Validação manual

- [x] 5.1 Confirmar que o card de IA mostra a key mascarada herdada do
      `.env` (pós-seed da migração) `[R2.1]` — confirmado via
      `GET /api/admin/ai-settings` autenticado (`php artisan serve` local +
      login real como `admin@admin.com`): retornou `openai_api_key_set: true`
      com máscara terminando nos últimos 4 caracteres da key do `.env`.
- [x] 5.2 Salvar uma key nova via `PUT` e confirmar que o valor persistido
      muda `[R1.2]` — confirmado: `PUT` com uma key de teste
      (`sk-teste-...DXYZ`) e o `GET` seguinte já refletiu a nova máscara
      (`...DXYZ`). Não foi gerado um relatório real para não gastar uma
      chamada de API paga; a troca de fonte em `OpenAIService` já está
      coberta por leitura de código (1.5) — quem quiser confirmar
      ponta-a-ponta com uma chamada real à OpenAI pode gerar um diagnóstico
      de teste agora. Valor de produção/dev restaurado ao original
      logo em seguida, via tinker.
- [x] 5.3 Tentar salvar o campo em branco e confirmar que a key salva
      anteriormente não muda `[R1.3]` — confirmado: `PUT` com
      `openai_api_key: ""` manteve a mesma máscara do `GET` anterior.
- [x] 5.4 Confirmar que `GET`/`PUT /admin/ai-settings` nunca retornam
      `openai_api_key` em texto puro na resposta `[R3.1]` — confirmado nas
      três chamadas reais feitas (antes/depois/vazio): sempre só
      `openai_api_key_set`/`openai_api_key_masked`.
- [x] 5.5 Rodar `npx vite build` e `npx oxlint` na raiz do projeto e
      confirmar que não há erros novos — ambos limpos (build ok, oxlint sem
      saída/exit 0).

## Fase 6 — Cleanup opcional (fora do caminho crítico)

- [x] 6.1 Extraído `App\Support\Masks::last4()` e usado tanto em
      `AiSettingController` quanto em `WhatsAppController` (que antes tinha
      seu próprio `maskToken()` privado idêntico) — feito junto, já que o
      custo era baixo e evitava nascer com a duplicação.

---

## Notas

- Esta spec não depende de [[calendly-configuravel-admin]], mas mexe no
  mesmo arquivo (`IntegracoesPanel.jsx`) — ao implementar, conferir que os
  cards convivem sem conflito de merge, adicionando o card de IA como um
  novo bloco independente (mesmo padrão que a spec do Calendly já seguiu ao
  ser adicionada depois do card do WhatsApp).
- `AI_PROVIDER` e `OPENAI_MODEL` propositalmente não aparecem em nenhuma
  task aqui — permanecem no `.env`, por decisão de escopo confirmada antes
  de escrever esta spec.
