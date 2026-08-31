# Requirements — API Key da OpenAI configurável pelo admin (em vez de `.env`)

## Contexto e diagnóstico do estado atual

Análise feita no código existente em 2026-08-31.

- Hoje `OPENAI_API_KEY` vive em `backend/.env`, é lida em
  `config/services.php` (`services.openai.key`) e consumida em
  `OpenAIService::__construct()` para autenticar as chamadas a
  `https://api.openai.com/v1/chat/completions`.
- Trocar a key hoje exige acesso ao servidor, editar o `.env` do backend e
  reiniciar o PHP-FPM — não há forma de fazer isso pelo painel admin.
- **Decisão de escopo confirmada com o usuário**: só a API key sai do `.env`.
  `AI_PROVIDER` (openai | gemini) e `OPENAI_MODEL` continuam sendo lidos do
  `.env`/`config/services.php`, sem nenhuma mudança — não fazem parte desta
  spec.
- O projeto já resolve um problema parecido para outra credencial sensível: o
  Access Token da API oficial do WhatsApp (`WhatsappSetting` model, tabela
  `whatsapp_settings`, `WhatsAppController::settings()/updateSettings()`,
  rotas `GET/PUT /admin/whatsapp/settings`) é editável pelo admin, nunca é
  devolvido em texto puro (só mascarado, últimos 4 caracteres) e só é
  sobrescrito quando um valor novo e não vazio é enviado. Esta spec aplica o
  mesmo padrão à API key da OpenAI.
- Diferença importante em relação à spec [[calendly-configuravel-admin]]: lá o
  valor trocado (link do Calendly) é público e não sensível, e uma janela sem
  configuração era aceitável (só desabilita um botão). Aqui a ausência da key
  quebra a geração do relatório de diagnóstico — o núcleo do produto (lead
  completa o quiz, espera o PDF/WhatsApp). Por isso esta spec exige uma
  migração de dados sem downtime (Requisito 2), em vez de depender de um
  admin colar o valor manualmente depois do deploy.

---

## Requisito 1 — Admin configura a API key da OpenAI pela tela de Integrações

**User Story:** Como admin, quero colar uma nova API key da OpenAI direto no
painel, para poder trocá-la (ex. key comprometida, mudança de conta de
billing) sem depender de acesso ao servidor.

### Acceptance Criteria (EARS)

1. QUANDO o admin abre a tela de Integrações, O SISTEMA DEVE indicar se já
   existe uma key configurada, mostrando apenas uma versão mascarada dela
   (ex. `••••••••1234`) — NUNCA a key em texto puro.
2. QUANDO o admin cola uma key nova (string não vazia) e salva, O SISTEMA
   DEVE persistir esse valor no banco de dados e passar a usá-lo na próxima
   geração de relatório, sem exigir reinício ou novo deploy do backend.
3. QUANDO o admin salva o formulário com o campo da key em branco, O SISTEMA
   DEVE manter a key atualmente salva inalterada — não existe fluxo de
   "desconfigurar"/apagar a key pelo painel, pois isso quebraria a geração de
   relatórios (diferente do link do Calendly, que pode ficar vazio).
4. SE nunca houve nenhuma key configurada (nem por `.env` nem pelo admin), O
   SISTEMA DEVE exibir o campo vazio com um placeholder genérico, sem indicar
   falsamente que algo está salvo.
5. Uma falha de autenticação da OpenAI em runtime (key inválida/expirada)
   DEVE continuar caindo no tratamento de erro já existente em
   `OpenAIService`/`DiagnosticReportService` — esta spec não muda esse
   comportamento, só a fonte de onde a key é lida.

---

## Requisito 2 — Migração sem downtime: banco é a fonte primária, `.env` é fallback

**User Story:** Como desenvolvedor, quero que o deploy desta mudança não
interrompa a geração de relatórios em produção, mesmo antes de qualquer admin
abrir a tela de Integrações e confirmar a key.

### Acceptance Criteria (EARS)

1. QUANDO a migração que cria a tabela de configuração roda, O SISTEMA DEVE
   semear a linha inicial com o valor de `OPENAI_API_KEY` lido do `.env` no
   momento da migração (se existir) — para que, imediatamente após o deploy,
   o banco já tenha o mesmo valor que o `.env` tinha.
2. QUANDO o backend for gerar um relatório, O SISTEMA DEVE usar a key do
   banco; SE o valor no banco estiver vazio (ex. instalação nova, seed não
   rodou), O SISTEMA DEVE cair de volta (fallback) para `config('services.openai.key')`
   (`.env`) em vez de falhar sem tentar.
3. `AI_PROVIDER` e `OPENAI_MODEL` (e a configuração do Gemini) NÃO DEVEM ser
   afetados por esta spec — continuam vindo exclusivamente do `.env`, por
   decisão explícita de escopo.

---

## Requisito 3 — A key nunca é exposta em texto puro

**User Story:** Como responsável pela segurança da aplicação, quero ter
certeza de que a API key da OpenAI não vaza por nenhum endpoint ou log, já
que ela dá acesso direto a uma conta de billing de terceiros.

### Acceptance Criteria (EARS)

1. Nenhum endpoint (incluindo os autenticados de admin) DEVE devolver
   `openai_api_key` em texto puro na resposta — apenas uma versão mascarada
   (últimos 4 caracteres) e um booleano indicando se já está configurada.
2. O corpo da requisição `PUT` que envia a key nova NÃO DEVE ser gravado em
   nenhum log de aplicação (validar que não há middleware/log de request que
   capture `$request->all()` nessa rota).

---

## Fora de escopo (explicitamente não coberto por esta spec)

- Configurar `AI_PROVIDER` (openai | gemini) pelo admin — continua no `.env`.
- Configurar `OPENAI_MODEL` pelo admin — continua no `.env`.
- Qualquer configuração do Gemini (`GEMINI_API_KEY`) — fora de escopo, só a
  OpenAI está em questão aqui.
- Múltiplas keys (ex. uma por ambiente/cliente) — continua uma única key
  global, como hoje.
- Rotação automática ou expiração programada da key — troca é sempre manual,
  feita pelo admin quando necessário.
- Validar a key contra a API da OpenAI no momento do save (ex. chamada de
  teste) — a validação de que a key funciona só acontece na próxima geração
  real de relatório, igual ao comportamento atual com `.env`.
