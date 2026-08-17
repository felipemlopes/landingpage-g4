# Tasks — SEO, Provider de WhatsApp e Diagnóstico com IA

Convenção: cada task referencia os critérios de aceite de `requirements.md` que ela implementa (ex. `[R1.1]`).

## Fase 1 — SEO

- [x] 1.1 Criar `og-image.png` (1200x630) com marca G4 + proposta de valor `[R1.5]` — gerado como placeholder programático (fundo escuro + dourado + headline); recomenda-se substituir por arte final do time de design.
- [x] 1.2 Atualizar `index.html` com meta description, canonical, Open Graph, Twitter Card `[R1.1, R1.5]`
- [x] 1.3 Adicionar JSON-LD (`Organization`/`WebSite`) no `index.html` `[R1.6]`
- [x] 1.4 Criar `public/robots.txt` (`Disallow: /admin`, aponta pro sitemap) `[R1.2]`
- [x] 1.5 Criar `public/sitemap.xml` `[R1.3]`
- [ ] 1.5.1 **BLOQUEADO — precisa do domínio de produção**: todos os arquivos acima usam o placeholder `https://SITE_URL/` (em `index.html`, `robots.txt`, `sitemap.xml`). Substituir por find & replace assim que o domínio final for definido.
- [ ] 1.6 Confirmar como o frontend é servido em produção (Nginx/Vercel/Laravel) e configurar `X-Robots-Tag: noindex` para `/admin/*` no ponto correto — **depende de decisão do usuário sobre infra de deploy** `[R1.4]`
- [ ] 1.7 Avaliar e, se aprovado, configurar prerender build-time da rota `/` (`vite-plugin-prerender` ou script próprio) — **não executado**: exige instalar Puppeteer/Playwright (dependência pesada), decisão que fica para o usuário aprovar `[R1.9]`
- [ ] 1.8 Rodar Lighthouse mobile e corrigir achados de LCP/CLS — **não executado**: exige app rodando publicamente/localmente com Chrome disponível `[R1.8]`
- [ ] 1.9 Validar preview do link no WhatsApp Web (compartilhar a URL e conferir card gerado) — **não executado**: precisa de URL pública (só funciona após deploy com domínio real, já que crawlers de preview não acessam `localhost`) `[R1.5]`

## Fase 2 — Provider de WhatsApp (Evolution x Oficial)

- [x] 2.1 Criar `WhatsAppProviderInterface` em `backend/app/Services/WhatsApp/` `[R2.1]`
- [x] 2.2 Mover lógica atual de `WhatsAppService.php` para `EvolutionProvider implements WhatsAppProviderInterface` `[R2.2]` — arquivo antigo removido, nada mais referencia `WhatsAppService`.
- [x] 2.3 Implementar `OfficialCloudApiProvider` (Graph API: `sendText`, `sendDocument` via upload de mídia, `connectionStatus`) `[R2.3, R2.8]`
- [x] 2.4 Criar `WhatsAppProviderFactory` + binding no `AppServiceProvider` lendo `WHATSAPP_PROVIDER` `[R2.1, R2.4]`
- [x] 2.5 Adicionar `WHATSAPP_PROVIDER`, `WHATSAPP_CLOUD_*` em `backend/.env.example` e `config/services.php` `[R2.1, R2.3]` — também documentei `GEMINI_API_KEY`/`EVOLUTION_*`, que já eram usados no código mas não estavam no `.env.example`.
- [x] 2.6 Atualizar `ReportController` para depender de `WhatsAppProviderInterface` em vez de `WhatsAppService` `[R2.1]`
- [x] 2.7 Criar endpoints `GET /api/admin/whatsapp/status` e `POST /api/admin/whatsapp/connect` `[R2.5, R2.6, R2.8]`
- [x] 2.8 Garantir que os endpoints nunca retornem segredos crus (mascarar número/nome) `[R2.9]`
- [x] 2.9 Criar `src/pages/Admin/IntegracoesPanel.jsx` com exibição de status + botão Conectar/Testar `[R2.5, R2.6, R2.8]`
- [x] 2.10 Adicionar aba "Integrações" em `Sidebar.jsx` e rota em `AdminPanel.jsx` `[R2.5]`
- [x] 2.11 Implementar polling de status após "Conectar" (QR Evolution) até `connected: true` `[R2.7]`
- [x] 2.12 Adicionar `whatsappApi` em `src/services/api.js` `[R2.5]`
- [ ] 2.13 Testar manualmente os dois providers ponta a ponta (Evolution real + WhatsApp Cloud API sandbox da Meta) `[R2.2, R2.3]` — **não executado**: precisa de credenciais reais (instância Evolution ativa e/ou app Meta com número de teste), que não existem neste ambiente.
- [ ] 2.14 **Não testado visualmente no navegador**: `backend/vendor` não está instalado (sem `composer install`) e não há banco de dados migrado neste ambiente, então não foi possível subir a API e validar a tela "Integrações" end-to-end. Validado apenas: `php -l` em todos os arquivos PHP novos/alterados, `npx vite build` e `npx oxlint` sem erros novos no frontend.

## Fase 3 — Diagnóstico com OpenAI + PDF + rastreabilidade

- [x] 3.1 Criar `AIReportProviderInterface` em `backend/app/Services/AI/` `[R3.1]`
- [x] 3.2 Extrair `buildPrompt()` do `GeminiService` para um trait/base compartilhado `[R3.1]` — `PromptBuilder` trait, usado por `OpenAIService` e `GeminiService`.
- [x] 3.3 Implementar `OpenAIService implements AIReportProviderInterface` (chat/completions, timeout, tratamento de resposta vazia) `[R3.1, R3.2]`
- [x] 3.4 Fazer `GeminiService` implementar a mesma interface (sem mudar comportamento) `[R3.1]` — movido de `app/Services/GeminiService.php` para `app/Services/AI/GeminiService.php`.
- [x] 3.5 Criar `AIProviderFactory` lendo `AI_PROVIDER` (default `openai`) `[R3.1]`
- [x] 3.6 Adicionar `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_PROVIDER` em `.env.example` e `config/services.php` `[R3.1, R3.10]`
- [x] 3.7 Atualizar `ReportController` para usar `AIReportProviderInterface`, preservando o `fallbackReport()` atual `[R3.1, R3.2]`
- [x] 3.8 Migration: adicionar `report_generated_at`, `ai_provider_used`, `whatsapp_status`, `whatsapp_error` em `leads` `[R3.7]` — **não executada** (`php artisan migrate`) neste ambiente por falta de `vendor/`/banco; só o arquivo de migration foi criado.
- [x] 3.9 Persistir o PDF gerado em `storage/app/reports/{lead_id}.pdf` `[R3.7, R3.8 (design 4.4)]`
- [x] 3.10 `LeadController@store` passa a retornar o `id` do lead criado `[R3.7 (design 4.3)]` — **já estava satisfeito**: `Lead::create()` do Eloquent já popula `id` antes do `response()->json($lead, 201)`; nenhuma mudança de código foi necessária.
- [x] 3.11 `Landing.jsx` repassa `lead_id` no payload de `POST /api/report` `[R3.7 (design 4.3)]`
- [x] 3.12 `ReportController@generate` atualiza o `Lead` com status de geração/envio ao final `[R3.7]`
- [x] 3.13 Criar `POST /api/admin/leads/{lead}/resend-report` (reenvia PDF já persistido, sem chamar IA de novo) `[R3.6, R3.8]`
- [x] 3.14 Atualizar `LeadsPanel.jsx` com badges "PDF gerado" / "WhatsApp enviado/falhou/pendente" + botão "Reenviar" `[R3.8]`
- [ ] 3.15 Teste manual: forçar falha de IA (chave inválida) e confirmar que o fallback estático assume sem quebrar o fluxo do lead `[R3.2]` — **não executado**: sem `vendor/`/banco/servidor rodando neste ambiente.
- [ ] 3.16 Teste manual: forçar falha de WhatsApp e confirmar que o PDF continua disponível para download `[R3.6]` — **não executado**, mesmo motivo acima.
- [ ] 3.17 Rodar `composer install`, `php artisan migrate` e `php artisan serve` para validar o fluxo completo ponta a ponta assim que houver ambiente disponível (DB configurado) — pré-requisito para 3.15/3.16.

## Fase 4 — Fila assíncrona

- [x] 4.1 Decidir com o usuário se o volume de leads justifica mover para fila antes de ir pra produção `[R3.9]` — usuário pediu para executar a fase diretamente; implementada. **Atenção**: com `QUEUE_CONNECTION=database`, é obrigatório rodar um worker (`php artisan queue:work`, via Supervisor/systemd) em produção, senão os diagnósticos ficam parados em `pending` para sempre. Reavaliar se o volume real justifica essa operação extra ou se `sync` (processamento inline, sem worker) é suficiente por enquanto.
- [x] 4.2 Criar `GenerateDiagnosticReportJob` e mover a lógica de `ReportController@generate` para dentro do job `[R3.9]` — a lógica de montar IA+PDF e enviar WhatsApp foi extraída para `DiagnosticReportService` (compartilhada com o `resend` da Fase 3), e o Job apenas orquestra + persiste o resultado.
- [x] 4.3 Trocar `QUEUE_CONNECTION` de `sync` para `database`/`redis` em produção `[R3.9]` — `.env.example` alterado para `database`; criada a migration da tabela `jobs` (não existia no projeto).
- [x] 4.4 `POST /api/report` retorna `202` + `report_id`; criar `GET /api/report/{id}` para polling `[R3.9]` — implementado com um refinamento de segurança: o polling é resolvido por um **token opaco aleatório** (`reports.token`), não pelo id sequencial, para não permitir que alguém enumere IDs e baixe o diagnóstico (nome, score, PDF) de outros leads.
- [x] 4.5 Atualizar `Landing.jsx`/`reportApi` no frontend para polling em vez de esperar resposta síncrona `[R3.9]` — o polling ficou encapsulado dentro de `reportApi.generate()` em `api.js`, que resolve com o mesmo formato `{ pdf, filename, whatsapp_sent }` de antes; **`Landing.jsx` não precisou de nenhuma alteração**.
- [ ] 4.6 **Não executado**: `php artisan migrate` (tabelas `jobs` e `reports` novas) e teste ponta a ponta com um worker rodando (`php artisan queue:work`) — mesmo bloqueio de ambiente das fases anteriores (sem `vendor/`, sem banco). Validado apenas via `php -l` em todos os arquivos e `npx vite build`/`npx oxlint` no frontend.

---

## Perguntas em aberto para o usuário antes de iniciar a implementação

1. **Infra de deploy do frontend** (fase 1.6): o build do Vite é servido pelo próprio Laravel, por um Nginx separado, ou por um host estático (Vercel/Netlify)? Isso muda onde a regra de `noindex` do `/admin` é aplicada.
2. **Credenciais reais para teste**: já existe conta de sandbox da Meta WhatsApp Cloud API e chave da OpenAI disponíveis, ou isso precisa ser provisionado antes da Fase 2/3?
3. **Volume esperado de leads/dia**: define se a Fase 4 (fila assíncrona) é necessária já no primeiro release ou pode ficar para depois.
4. **Imagem de `og:image`**: quem fornece a arte (1200x630) — time de design da G4 ou geração via IA/placeholder temporário?
