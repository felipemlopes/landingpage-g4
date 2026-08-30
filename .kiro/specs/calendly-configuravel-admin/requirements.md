# Requirements — Link do Calendly configurável pelo admin (em vez de `.env`)

## Contexto e diagnóstico do estado atual

Análise feita no código existente em 2026-08-30.

- Hoje o link do Calendly vem de `VITE_CALENDLY_URL`, lida em `src/config/calendly.js`
  (`isCalendlyConfigured()` / `buildCalendlyLink()`) e consumida em `ThankYou.jsx`
  para montar o CTA final "Quero analisar meu escritório".
- Por ser variável `VITE_*`, o valor é **embutido no bundle em tempo de build**
  (Vite) — trocar o link exige editar `.env`, rodar `npm run build` de novo e
  fazer um novo deploy (ver `Dockerfile`, que roda `npm run build` dentro da
  imagem). Não existe hoje nenhuma forma de trocar o link sem mexer em código/infra.
- O `.env` local do projeto nem tem essa variável definida — ou seja, o CTA está
  desabilitado ("Agendamento indisponível no momento") no ambiente atual.
- O projeto já resolve exatamente esse mesmo problema para outra integração: a
  configuração do WhatsApp (`WhatsappSetting` model, tabela `whatsapp_settings`,
  `WhatsAppController::settings()/updateSettings()`, rotas
  `GET/PUT /admin/whatsapp/settings`, tela `IntegracoesPanel.jsx`) é editável
  pelo admin, persistida no banco, sem precisar de rebuild/redeploy. Esta spec
  aplica o mesmo padrão ao link do Calendly.
- `buildCalendlyLink({ name, email })` (pré-preenchimento do formulário do
  Calendly com nome/e-mail do lead via query string) já funciona bem e **não
  muda de comportamento** — só passa a receber a URL base por parâmetro em vez
  de ler `import.meta.env` internamente.

---

## Requisito 1 — Admin configura o link do Calendly pela própria tela de Integrações

**User Story:** Como admin, quero editar o link de agendamento do Calendly
direto no painel, para poder trocá-lo (ex. trocar de conta, trocar o tipo de
evento) sem depender de alguém mexer em `.env` e fazer um novo deploy.

### Acceptance Criteria (EARS)

1. QUANDO o admin abre a tela de Integrações (`IntegracoesPanel.jsx`), O SISTEMA
   DEVE exibir um campo com a URL do Calendly atualmente configurada (vazio se
   nunca foi configurada).
2. QUANDO o admin preenche uma URL válida e clica em salvar, O SISTEMA DEVE
   persistir esse valor no banco de dados (não em `.env`/arquivo) e o novo link
   DEVE valer imediatamente no site público, sem exigir novo build ou deploy.
3. SE o admin submeter um valor que não é uma URL válida, O SISTEMA DEVE
   rejeitar a submissão e exibir uma mensagem de erro, sem alterar o valor
   salvo anteriormente.
4. QUANDO o admin limpa o campo (deixa vazio) e salva, O SISTEMA DEVE tratar o
   Calendly como "não configurado" — mesmo efeito de hoje quando
   `VITE_CALENDLY_URL` está vazia.
5. O SISTEMA NÃO DEVE exigir que a URL seja necessariamente do domínio
   `calendly.com` — contas pagas do Calendly podem usar domínio customizado.

---

## Requisito 2 — Frontend público passa a ler o link via API, não via `.env`

**User Story:** Como lead na tela de agradecimento, quero que o botão de
agendamento reflita sempre o link mais atual configurado pela empresa, sem
depender de quando o site foi buildado pela última vez.

### Acceptance Criteria (EARS)

1. QUANDO a tela `ThankYou` monta, O SISTEMA DEVE buscar a URL do Calendly em
   um endpoint público da API (sem autenticação), em vez de ler
   `import.meta.env.VITE_CALENDLY_URL`.
2. QUANDO a busca retorna uma URL configurada, O SISTEMA DEVE montar o link
   final pré-preenchido com nome/e-mail do lead exatamente como hoje
   (`buildCalendlyLink`), sem mudança visual ou de comportamento do CTA.
3. QUANDO a busca retorna vazio (não configurado) OU falha (erro de rede), O
   SISTEMA DEVE cair no mesmo estado de fallback que existe hoje: botão
   desabilitado "Agendamento indisponível no momento".
4. ENQUANTO a busca ainda está em andamento, O SISTEMA DEVE exibir um estado
   neutro (ex. botão desabilitado "Carregando...") — NÃO DEVE mostrar
   "indisponível" e depois trocar para o link funcionando, para evitar um piscar
   de estado incorreto.

---

## Requisito 3 — Descomissionamento de `VITE_CALENDLY_URL`

**User Story:** Como desenvolvedor, quero que só exista uma fonte de verdade
para o link do Calendly, para não ter alguém editando `.env` sem efeito nenhum
depois que o admin passa a controlar isso pelo banco.

### Acceptance Criteria (EARS)

1. O SISTEMA DEVE parar de ler `import.meta.env.VITE_CALENDLY_URL` em qualquer
   lugar do código (hoje: só `src/config/calendly.js`).
2. O SISTEMA DEVE remover a variável `VITE_CALENDLY_URL` do `.env.example` (ou
   substituí-la por um comentário explicando que a configuração agora é feita
   pelo painel admin, em Integrações).
3. Como não existe migração automática do valor hoje presente no `.env` de
   produção (se houver) para o banco, esta spec assume que um admin vai colar o
   link manualmente na tela de Integrações **uma vez**, logo após o deploy desta
   mudança — isso é uma tarefa operacional, não um requisito de código (ver
   `tasks.md`).

---

## Fora de escopo (explicitamente não coberto por esta spec)

- Múltiplos links de Calendly (ex. um por vendedor/atendente) — continua um
  único link global, como hoje.
- Qualquer mudança em como o link é pré-preenchido (`buildCalendlyLink`) além
  de passar a receber a URL base por parâmetro.
- Cache/CDN para o novo endpoint público — é uma chamada leve (uma string),
  sem necessidade de otimização adicional agora.
- Autenticação/whitelisting adicional no endpoint público — segue o mesmo
  padrão de `GET /questions`, que já é público e não sensível.
- Migração automática do valor de `VITE_CALENDLY_URL` de produção para o banco
  — é manual (Requisito 3.3).
