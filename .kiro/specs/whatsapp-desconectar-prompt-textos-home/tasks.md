# Tasks — Desconectar WhatsApp, Prompt da IA e Textos da Home configuráveis pelo admin

Convenção: cada task referencia os critérios de aceite de `requirements.md`
que ela implementa (ex. `[R1.1]`). Implementado em 2026-09-04, a pedido
explícito do usuário ("execute as tasks") — as decisões propostas na Fase 0
foram assumidas como aprovadas por essa instrução, sem confirmação linha a
linha; qualquer uma pode ser revertida/ajustada se não for o que o usuário
queria.

## Fase 0 — Confirmar decisões de escopo antes de codar

- [x] 0.1 Semântica de "desconectar" por provider assumida como proposta em
      `requirements.md` (Evolution = logout da sessão; API oficial = apagar
      credenciais) `[R1.2, R1.3]`
- [x] 0.2 Variáveis do prompt e limite de 6000 caracteres assumidos como
      propostos `[R2.2, R2.6]`
- [x] 0.3 Lista de 13 campos do Hero assumida como proposta `[R3.2]`
- [x] 0.4 Nenhum texto fora do Hero foi incluído — fica fora de escopo,
      como proposto

## Fase 1 — Backend: desconectar WhatsApp

- [x] 1.1 `disconnect(): array` adicionado em `WhatsAppProviderInterface` `[R1.2, R1.3]`
- [x] 1.2 `EvolutionProvider::disconnect()` implementado (logout via
      `DELETE /instance/logout/{instance}`, 404 tratado como já
      desconectado) `[R1.2]`
- [x] 1.3 `OfficialCloudApiProvider::disconnect()` implementado (apaga
      `cloud_token`, `cloud_phone_number_id`, `cloud_waba_id`) `[R1.3]`
- [x] 1.4 Action `WhatsAppController::disconnect()` + rota
      `POST /admin/whatsapp/disconnect` registrada e confirmada via
      `php artisan route:list` `[R1.1, R1.5]`
- [ ] 1.5 **Não testado ao vivo.** `GET /admin/whatsapp/status` no ambiente
      local retornou `connected: true` (Evolution já pareada com um número
      real) — desconectar de propósito derrubaria essa sessão de verdade,
      então pulei o teste funcional deste endpoint para não fazer algo
      difícil de reverter sem combinar antes. Lógica revisada por leitura de
      código + `php -l` limpo. `[R1.2, R1.5]`
- [ ] 1.6 Não testado (provider ativo no ambiente é `evolution`, não
      `official` — não há credenciais oficiais configuradas agora para
      exercitar este caminho sem antes trocar o provider, o que também
      afetaria a conexão real da Evolution). `[R1.3, R1.5]`

## Fase 2 — Frontend: desconectar WhatsApp

- [x] 2.1 `whatsappApi.disconnect()` em `src/services/api.js` `[R1.1]`
- [x] 2.2 Botão "Desconectar" no bloco de status (`IntegracoesPanel.jsx`),
      visível/habilitado só quando `status?.connected` `[R1.1, R1.6]`
- [x] 2.3 Modal de confirmação reaproveitando `ConfirmModal`, mensagem
      específica por provider `[R1.4]`
- [x] 2.4 Em sucesso: fecha modal, `loadStatus()` e, se `official`, recarrega
      `whatsappApi.getSettings()` `[R1.5]`
- [x] 2.5 Em erro: mensagem no bloco de erro já existente do card
- Validado via `npx vite build` + `npx oxlint` (ambos limpos). **Não
  clicado manualmente no navegador** (para não acionar o "Desconectar" de
  verdade contra a sessão real — ver 1.5).

## Fase 3 — Backend: prompt da IA editável

- [x] 3.1 Migração `create_ai_prompt_settings_table` — rodada com sucesso `[R2.1]`
- [x] 3.2 Model `App\Models\AiPromptSetting` `[R2.1]`
- [x] 3.3 `PromptBuilder::DEFAULT_PROMPT_TEMPLATE` (constante) +
      `buildPrompt()` usando `strtr()` a partir de
      `AiPromptSetting::current()->prompt_template ?: self::DEFAULT_PROMPT_TEMPLATE` `[R2.2, R2.3, R2.4]`
- [x] 3.4 `AiPromptSettingController` (`index`/`update`) `[R2.1, R2.3, R2.4, R2.6]`
- [x] 3.5 `GET/PUT /admin/ai-prompt-settings` registradas e confirmadas via
      `php artisan route:list` `[R2.1, R2.3]`
- [x] 3.6 Migração rodada; `GET /admin/ai-prompt-settings` confirmado
      retornando `prompt_template: null` (usa o padrão) `[R2.1]`
- [x] 3.7 `OpenAIService`/`GeminiService` não foram tocados diretamente —
      só a trait mudou; ambos continuam usando `buildPrompt()` normalmente `[R2.7]`
- **Bug encontrado e corrigido durante o teste ao vivo**: a primeira versão
  do controller referenciava `PromptBuilder::DEFAULT_PROMPT_TEMPLATE`
  diretamente — PHP não permite acessar constante de trait pelo nome dela
  fora de uma classe que a usa (erro fatal, confirmado via `curl`). Corrigido
  para `OpenAIService::DEFAULT_PROMPT_TEMPLATE` (classe que consome a trait).
  `design.md` atualizado para refletir a correção.
- Confirmado via `curl` autenticado: `GET` retorna o padrão; `PUT` com um
  template de teste persiste e é refletido no `GET` seguinte; `PUT` com
  string vazia restaura o padrão (`prompt_template` volta a `null`).

## Fase 4 — Frontend: prompt da IA editável

- [x] 4.1 `aiPromptSettingsApi` em `src/services/api.js` `[R2.1, R2.3]`
- [x] 4.2 Card "Prompt da IA" em `IntegracoesPanel.jsx`: textarea grande,
      placeholder = padrão, ajuda com as 5 variáveis, contador de caracteres `[R2.1, R2.2, R2.6]`
- [x] 4.3 Preview ao vivo com valores de exemplo (`{marca}` = `APP_NAME`,
      importado de `src/config/brand.js`) `[R2.5]`
- [x] 4.4 Botões "Salvar prompt" (desabilitado acima de 6000 caracteres) e
      "Restaurar padrão" `[R2.3, R2.4, R2.6]`
- Validado via `npx vite build` + `npx oxlint` (limpos). Backend por trás
  confirmado via `curl` (Fase 3); clique manual no navegador não realizado.

## Fase 5 — Backend: textos da Home editáveis

- [x] 5.1 Migração `create_home_content_settings_table` — rodada com sucesso `[R3.2]`
- [x] 5.2 Model `App\Models\HomeContentSetting` com `DEFAULTS` e `resolved()` `[R3.1, R3.2]`
- [x] 5.3 `HomeContentController` (`show` público, `update` admin —
      cada campo tratado independentemente) `[R3.1, R3.3, R3.4, R3.7]`
- [x] 5.4 `GET /home-content` (pública) e `PUT /admin/home-content` (admin)
      registradas e confirmadas via `php artisan route:list` `[R3.1, R3.3, R3.7]`
- [x] 5.5 Migração rodada; `GET /home-content` confirmado devolvendo os 13
      campos com os valores padrão atuais (idênticos ao `Hero.jsx` original) `[R3.1]`
- Confirmado via `curl`: `PUT` alterando só `badge_text` persiste e aparece
  no `GET` público; `PUT` com `badge_text` vazio restaura só aquele campo
  (os outros 12 continuam com os valores padrão, intocados).

## Fase 6 — Frontend: textos da Home editáveis

- [x] 6.1 `homeContentApi` em `src/services/api.js` `[R3.1, R3.3]`
- [x] 6.2 `Hero.jsx`: literais viram `content.*`, estado inicial =
      `DEFAULT_CONTENT` (idêntico ao texto anterior), sobrescrito por
      `homeContentApi.get()` no mount, falha silenciosa `[R3.1, R3.6]`
- [x] 6.3 `src/pages/Admin/ConteudoPanel.jsx` criado: um campo por texto
      (13 campos, agrupados — headline, subheadline, 3 stats, CTA), preview
      reduzido do Hero recalculado a cada edição, botões "Salvar textos" e
      "Restaurar todos os padrões" `[R3.2, R3.4, R3.5]`
- [x] 6.4 Item "Conteúdo" em `Sidebar.jsx` + roteamento da tab `conteudo`
      em `AdminPanel.jsx` `[R3.2]`
- [x] 6.5 Confirmado via `curl` que `GET /home-content` sem nenhuma
      customização devolve exatamente os textos que estavam fixos em
      `Hero.jsx` antes desta spec `[R3.6]`
- Validado via `npx vite build` + `npx oxlint` (limpos). Navegação/clique
  manual pelo painel `/admin/conteudo` não realizado nesta rodada.

## Fase 7 — Validação manual (todas as três mudanças)

- [x] 7.1 `npx vite build` e `npx oxlint` na raiz do projeto — ambos sem
      erros
- [x] 7.2 `php artisan route:list` confirmando as 7 rotas novas
      (`whatsapp/disconnect`, `ai-prompt-settings` ×2, `home-content` ×2 —
      pública e admin) — todas presentes
- [ ] 7.3 Fluxo ponta-a-ponta completo (gerar um diagnóstico de teste de
      verdade, IA + PDF) **não executado** — geraria uma chamada paga à
      OpenAI só para validar; o encadeamento `PromptBuilder` →
      `OpenAIService`/`GeminiService` foi conferido por leitura de código
      (nenhum dos dois foi tocado além da trait compartilhada) mais o teste
      isolado da Fase 3. Recomendo gerar um diagnóstico de teste real quando
      quiser confirmar ponta-a-ponta.

---

## Notas

- Esta spec mexeu em `IntegracoesPanel.jsx` (Requisitos 1 e 2) no mesmo
  arquivo já alterado pelas specs [[calendly-configuravel-admin]],
  [[openai-key-configuravel-admin]] e [[whatsapp-pixel-meta-textos-hero]] —
  os blocos novos foram adicionados como cards independentes, sem reescrever
  os existentes.
- `ConteudoPanel.jsx` (Requisito 3) é o primeiro painel admin fora de
  Leads/Perguntas/Integrações/Perfil — roteamento em `AdminPanel.jsx`
  precisou só do `if (tab === 'conteudo')` adicional, como previsto.
- **Pendências que dependem de você**: testar "Desconectar" de verdade na
  tela de Integrações (evitei fazer isso sozinho porque a sessão da
  Evolution no ambiente local está conectada a um número real — ver Fase
  1); dar uma olhada visual no painel `/admin/conteudo` e no card "Prompt da
  IA"; gerar um diagnóstico de teste ponta-a-ponta se quiser validar o
  prompt customizado saindo no PDF de verdade.
