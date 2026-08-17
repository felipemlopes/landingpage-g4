# Requirements — SEO, Provider de WhatsApp e Diagnóstico com IA

## Contexto e diagnóstico do estado atual

Análise feita no código existente (frontend `src/`, backend `backend/`) em 2026-08-15.

### SEO — o que existe hoje
- SPA 100% client-side rendered (React + Vite + `react-router-dom`, sem SSR/prerender).
- `index.html` só tem `<title>`. Não há `meta description`, `og:*`, `twitter:*`, `canonical`, `robots`, dados estruturados (JSON-LD).
- Não existe `robots.txt` nem `sitemap.xml` em `public/`.
- A rota `/admin/*` não tem `noindex` — pode ser indexada pelo Google hoje.
- Todo o conteúdo de negócio (headline, proposta de valor, quiz) só existe depois do JS rodar — crawlers que não executam JS (Facebook/WhatsApp/LinkedIn link preview, Bing antigo) não veem nada além de um `<div id="root">` vazio.
- Não há `og:image`, o que significa que links compartilhados no WhatsApp (canal principal de distribuição deste funil) não geram preview de imagem/título/descrição.

### WhatsApp — o que existe hoje
- `backend/app/Services/WhatsAppService.php` fala **apenas** com a Evolution API (`EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE` no `.env`).
- Não existe nenhuma integração com a API oficial (Meta WhatsApp Cloud API/WABA).
- Não existe abstração de "provider" — o `ReportController` chama `WhatsAppService` diretamente, sem seleção de estratégia.
- Não existe nenhuma tela no admin (`src/pages/Admin/`) para configurar ou conectar WhatsApp. As únicas abas hoje são **Leads**, **Perguntas** e **Perfil**.
- Não há fluxo de pareamento (QR Code) nem tela de status de conexão em lugar nenhum do sistema.

### Diagnóstico com IA + PDF — o que existe hoje
- `backend/app/Services/GeminiService.php` gera o texto do relatório usando **Google Gemini** (`GEMINI_API_KEY`), não OpenAI.
- `ReportController@generate` já orquestra o fluxo completo: chama a IA → monta eixos por categoria → renderiza PDF via `barryvdh/laravel-dompdf` (`resources/views/pdf/report.blade.php`) → envia texto + PDF pelo WhatsApp (Evolution) → retorna o PDF em base64 pro frontend baixar.
- Fluxo é síncrono dentro de uma única requisição HTTP (`POST /api/report`), disparado em background pelo frontend logo após salvar o lead (`Landing.jsx`), sem fila/retry.
- Não há campo no banco (`leads` table) que registre se o PDF foi gerado ou se o envio por WhatsApp teve sucesso — o único rastro é o `whatsapp_sent` devolvido na resposta HTTP, que se perde se o usuário fechar a aba.
- Existe fallback estático (`fallbackReport()`) caso a IA falhe — bom, deve ser preservado.

---

## Requisito 1 — SEO técnico e de conteúdo

**User Story:** Como responsável de marketing da G4, quero que a landing page seja indexável e gere previews ricos quando compartilhada, para que o funil de diagnóstico tenha alcance orgânico e boa aparência quando o link circular no WhatsApp/redes sociais.

### Acceptance Criteria (EARS)

1. QUANDO qualquer crawler requisita `/`, O SISTEMA DEVE responder com HTML já contendo `<title>`, `<meta name="description">`, `<link rel="canonical">`, `og:title`, `og:description`, `og:image`, `og:type`, `og:url`, `twitter:card` preenchidos, sem depender de execução de JavaScript.
2. QUANDO um crawler requisita `/robots.txt`, O SISTEMA DEVE retornar um arquivo válido permitindo `/` e bloqueando `/admin`.
3. QUANDO um crawler requisita `/sitemap.xml`, O SISTEMA DEVE retornar um sitemap válido listando as URLs públicas indexáveis.
4. QUANDO um crawler requisita qualquer rota sob `/admin`, O SISTEMA DEVE responder com `<meta name="robots" content="noindex,nofollow">` ou cabeçalho `X-Robots-Tag: noindex, nofollow`.
5. SE a página inicial for compartilhada em um app de mensagens ou rede social, ENTÃO O SISTEMA DEVE exibir uma prévia com imagem (`og:image` com dimensão mínima 1200x630), título e descrição específicos do diagnóstico G4.
6. O SISTEMA DEVE expor dados estruturados (JSON-LD, tipo `Organization` e/ou `WebSite`) na página inicial.
7. QUANDO a página é carregada, O SISTEMA DEVE conter exatamente um `<h1>` com o texto principal da proposta de valor (já existe em `Hero.jsx` — deve ser preservado no HTML servido antes do hydrate).
8. O SISTEMA DEVE atingir métricas de Core Web Vitals aceitáveis (LCP < 2.5s, CLS < 0.1) no relatório Lighthouse mobile, considerando que hoje não há lazy-loading/otimização de assets configurada no Vite.
9. SE o negócio decidir não investir em SSR completo, ENTÃO O SISTEMA DEVE ao menos gerar um HTML pré-renderizado (build-time prerender) da rota `/` com o conteúdo real do `Hero`, para que crawlers sem JS enxerguem o conteúdo textual mínimo.

---

## Requisito 2 — Seleção e conexão de provider de WhatsApp (Evolution API x API Oficial)

**User Story:** Como administrador da G4, quero escolher no `.env` qual provider de WhatsApp o sistema usa (Evolution API ou WhatsApp Cloud API oficial da Meta) e finalizar a conexão pelo painel admin, para que eu possa trocar de provider sem alterar código.

### Acceptance Criteria (EARS)

1. O SISTEMA DEVE ler uma variável `WHATSAPP_PROVIDER` no `.env` do backend com valores possíveis `evolution` ou `official`.
2. SE `WHATSAPP_PROVIDER=evolution`, ENTÃO O SISTEMA DEVE usar as credenciais `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE` já existentes.
3. SE `WHATSAPP_PROVIDER=official`, ENTÃO O SISTEMA DEVE usar novas variáveis (`WHATSAPP_CLOUD_TOKEN`, `WHATSAPP_CLOUD_PHONE_NUMBER_ID`, `WHATSAPP_CLOUD_WABA_ID`, `WHATSAPP_CLOUD_VERIFY_TOKEN`) para falar com a Graph API da Meta.
4. QUANDO o `.env` não tiver as credenciais do provider selecionado, O SISTEMA DEVE reportar o serviço como "desconectado" em vez de lançar exceção não tratada.
5. QUANDO o administrador acessa a nova aba **Integrações** no painel admin, O SISTEMA DEVE exibir qual provider está ativo (lido do backend) e o status de conexão atual.
6. SE o provider ativo for `evolution` e a instância não estiver pareada, ENTÃO O SISTEMA DEVE exibir um botão "Conectar" que solicita o QR Code à Evolution API e o exibe na tela.
7. QUANDO o QR Code é exibido, O SISTEMA DEVE fazer polling do status da instância e atualizar a UI automaticamente para "Conectado" assim que o pareamento for concluído, sem exigir reload manual.
8. SE o provider ativo for `official`, ENTÃO O SISTEMA DEVE exibir um botão "Testar conexão" que valida o token/phone number ID contra a Graph API e mostra o número verificado (display name/phone) em caso de sucesso, ou a mensagem de erro da Meta em caso de falha.
9. O SISTEMA NÃO DEVE expor `EVOLUTION_API_KEY`, `WHATSAPP_CLOUD_TOKEN` ou qualquer segredo bruto para o frontend — apenas status derivado (conectado/desconectado, nome/número mascarado).
10. QUANDO o admin troca de provider apenas editando o `.env` (sem redeploy de frontend), O SISTEMA DEVE refletir a mudança na aba Integrações após reiniciar/cache-clear do backend, sem exigir alteração de código.

---

## Requisito 3 — Diagnóstico gerado por IA (OpenAI), PDF e envio por WhatsApp

**User Story:** Como lead que respondeu o quiz, quero receber um diagnóstico personalizado gerado por IA em PDF, enviado automaticamente no meu WhatsApp, para entender minha maturidade comercial sem precisar esperar contato humano.

### Acceptance Criteria (EARS)

1. QUANDO um lead conclui o formulário pós-quiz, O SISTEMA DEVE gerar o texto do diagnóstico chamando a API da OpenAI (substituindo/complementando o Gemini atual), usando nome, score, respostas e categorias do lead como contexto.
2. SE a chamada à OpenAI falhar (timeout, erro de API, resposta vazia), ENTÃO O SISTEMA DEVE usar automaticamente o relatório de fallback estático já existente (`fallbackReport()`), sem quebrar o fluxo do usuário.
3. QUANDO o texto do diagnóstico é gerado, O SISTEMA DEVE renderizá-lo em um PDF (mantendo o template Blade `resources/views/pdf/report.blade.php` e os eixos por categoria já calculados).
4. QUANDO o PDF é gerado, O SISTEMA DEVE enviá-lo pelo WhatsApp do lead usando o provider ativo (Requisito 2), com uma mensagem de texto amigável seguida do documento.
5. O SISTEMA DEVE continuar retornando o PDF em base64 na resposta HTTP para download imediato no navegador, independentemente do resultado do envio por WhatsApp.
6. QUANDO o envio por WhatsApp falha, O SISTEMA DEVE registrar o motivo da falha e continuar disponibilizando o PDF para download — a falha de WhatsApp não pode bloquear a entrega do diagnóstico.
7. O SISTEMA DEVE persistir no registro do lead (tabela `leads`) o status da geração (`report_generated_at`, `ai_provider_used`) e do envio (`whatsapp_status`: pendente/enviado/falhou), para que o admin veja isso na aba Leads.
8. QUANDO o administrador visualiza um lead na aba **Leads**, O SISTEMA DEVE mostrar um indicador visual de "PDF gerado" e "Enviado no WhatsApp" (ou botão "Reenviar" em caso de falha).
9. O SISTEMA DEVE limitar o prompt/á chamada da OpenAI para não exceder tempo de resposta que cause timeout HTTP no `POST /api/report` (hoje síncrono); SE o processamento demorar mais que um limite aceitável, ENTÃO O SISTEMA DEVE mover a geração para uma fila assíncrona (Laravel Queue) e o frontend deve fazer polling do status em vez de esperar a resposta.
10. A chave da OpenAI (`OPENAI_API_KEY`) DEVE ser configurável via `.env`, seguindo o mesmo padrão de `config/services.php` já usado para `gemini` e `evolution`.

---

## Fora de escopo (explicitamente não coberto por esta spec)

- Migração completa para SSR (Next.js/Remix) — tratada apenas como opção avaliada no Requisito 1.9, não como exigência obrigatória.
- Múltiplos idiomas / i18n.
- Disparo de campanhas de WhatsApp em massa (fora do fluxo 1:1 pós-diagnóstico).
- Edição de credenciais de provider via UI do admin (a spec assume que credenciais ficam no `.env`, conforme pedido do usuário; o admin só executa a *conexão*, não a *configuração* de chaves).
