# Requirements — Mensagem do WhatsApp configurável, Pixel da Meta e novos textos da Home

## Contexto e diagnóstico do estado atual

Análise feita no código existente em 2026-09-01.

- O texto que acompanha o PDF no WhatsApp está fixo em código, em
  `DiagnosticReportService::deliverViaWhatsApp()` (`backend/app/Services/DiagnosticReportService.php:81`):
  `"Olá, *{$name}*! 👋\n\nSeu diagnóstico comercial está pronto. Você alcançou *{$score}/100 pontos* — nível *{$level}*.\n\nSegue em anexo seu relatório personalizado com o plano de crescimento. Nossa equipe entrará em contato em breve! 🚀"`.
  Trocar esse texto hoje exige editar código e fazer deploy. A legenda do
  próprio arquivo PDF anexado (`sendDocument(..., '📊 Diagnóstico Comercial G4 Business')`)
  é um segundo texto fixo, separado.
- Não existe nenhuma integração com o Pixel da Meta (Facebook Ads) em lugar
  nenhum do projeto — confirmado por busca no código (`fbq`, `pixel`,
  `facebook`, `meta pixel`: nenhuma ocorrência em `src/` ou `backend/`).
- O headline/subheadline/selo/stats da Home estão fixos em
  `src/components/Hero.jsx`. Comparando com o texto que o cliente quer:
  - Selo (`Hero.jsx:86`, `"Diagnóstico gratuito · 2 min"`) **já bate** com o
    pedido — o CSS já força uppercase (`textTransform: 'uppercase'`), então
    "Diagnóstico gratuito · 2 min" e "DIAGNÓSTICO GRATUITO · 2 MIN" renderizam
    de forma idêntica. Nenhuma mudança necessária aqui.
  - Headline (`Hero.jsx:101-106`, "Descubra o nível de maturidade comercial da
    sua empresa") **é diferente** do pedido — precisa mudar.
  - Subheadline (`Hero.jsx:119`, "9 perguntas sobre como sua empresa gera e
    converte clientes...") **é diferente** do pedido — precisa mudar.
  - Stats (`Hero.jsx:138-142`): das 3 caixinhas atuais (`9 Perguntas`,
    `2min Para concluir`, `100% Gratuito`), as 2 que o cliente citou
    (`2min PARA CONCLUIR`, `100% GRATUITO`) **já batem** com o texto atual —
    só a caixinha "9 Perguntas" fica de fora do pedido e é mantida como está
    (decisão confirmada com o usuário).
- O projeto já resolve o mesmo tipo de problema (valor trocável sem deploy)
  para o link do Calendly — spec [[calendly-configuravel-admin]]
  (`CalendlySetting`, tabela singleton, `GET` público + `PUT` admin). Esta
  spec aplica o mesmo padrão à mensagem do WhatsApp e ao Pixel ID da Meta.

### Decisões de escopo confirmadas com o usuário (2026-09-01)

1. Os textos da Home (Requisito 3) são editados **direto no código**, não
   viram configuráveis pelo admin — diferente de Calendly/WhatsApp/IA.
2. Do bloco de stats, só os 2 valores citados pelo cliente são conferidos;
   a caixinha "9 Perguntas" permanece exatamente como está hoje.
3. Da mensagem do WhatsApp, só o **texto que acompanha o PDF** vira
   configurável — a legenda do próprio arquivo PDF anexado continua fixa.
4. O Pixel da Meta é **só o pixel padrão client-side** (Pixel ID + eventos
   `PageView`/`Lead` disparados no navegador) — sem Conversions API
   (server-side), que ficaria a cargo de uma spec futura se necessário.

---

## Requisito 1 — Admin configura o texto da mensagem de WhatsApp enviada com o PDF

**User Story:** Como admin, quero editar o texto que acompanha o PDF no
WhatsApp direto no painel, para ajustar tom de voz/oferta ao longo do tempo
sem depender de um deploy.

### Acceptance Criteria (EARS)

1. QUANDO o admin abre a tela de Integrações, O SISTEMA DEVE exibir um campo
   com o template atualmente salvo — vazio (mostrando o template padrão como
   referência) se nunca foi configurado.
2. QUANDO o admin salva um texto novo e não vazio, O SISTEMA DEVE persistir
   esse valor no banco de dados e usá-lo a partir do próximo envio de
   WhatsApp, sem exigir deploy ou reinício do backend.
3. O SISTEMA DEVE suportar as variáveis `{nome}`, `{pontuacao}` e `{nivel}`
   dentro do template, substituindo-as pelos valores reais do lead (nome
   informado, score 0-100, rótulo do nível) no momento do envio.
4. SE o admin salvar o campo em branco, O SISTEMA DEVE voltar a usar o
   template padrão embutido no backend (o texto atual, preservado como
   fallback) — funciona como "restaurar padrão"; o envio nunca fica sem
   mensagem de texto.
5. ENQUANTO o admin edita o template, O SISTEMA DEVE mostrar um preview ao
   vivo com valores de exemplo (ex.: nome "João Silva", pontuação 82, nível
   "Em Transição") substituindo as variáveis, para conferir formatação/emojis
   antes de salvar.
6. SE o template ultrapassar 4096 caracteres (limite de mensagem de texto do
   WhatsApp), O SISTEMA DEVE rejeitar o salvamento com uma mensagem de erro,
   mantendo o template salvo anteriormente inalterado.
7. A legenda do documento PDF anexado (segundo parâmetro de
   `sendDocument`, hoje fixo `"📊 Diagnóstico Comercial G4 Business"`) NÃO É
   alterada por esta spec — decisão de escopo confirmada.
8. Este requisito NÃO DEVE alterar o pipeline de geração/fila
   (`GenerateDiagnosticReportJob`) nem a lógica de envio em si
   (`WhatsAppProviderInterface`/providers) — só a origem do texto usado em
   `sendText`.

---

## Requisito 2 — Admin configura o Pixel da Meta

**User Story:** Como responsável de marketing, quero cadastrar o ID do Pixel
da Meta pelo painel, para rastrear visitas e leads gerados pela landing page
nos anúncios, podendo trocar de conta/pixel sem depender de deploy.

### Acceptance Criteria (EARS)

1. QUANDO o admin abre a tela de Integrações, O SISTEMA DEVE exibir um campo
   com o Pixel ID atualmente configurado — vazio se nunca foi configurado.
2. QUANDO o admin salva um Pixel ID válido (string numérica) e salva, O
   SISTEMA DEVE persistir esse valor no banco de dados, e o pixel DEVE passar
   a carregar no site público imediatamente, sem deploy.
3. QUANDO o admin limpa o campo e salva, O SISTEMA DEVE parar de carregar o
   pixel no site (estado "desativado").
4. QUANDO a Home (`/`) carrega E existe um Pixel ID configurado, O SISTEMA
   DEVE injetar o script padrão do Meta Pixel (bootstrap `fbq` + evento
   automático `PageView`) uma única vez por carregamento de página.
5. QUANDO o lead é criado com sucesso ao final do quiz (`leadsApi.submit`
   resolve), O SISTEMA DEVE disparar o evento padrão `Lead` do Meta Pixel
   (`fbq('track','Lead')`), SE o pixel estiver carregado.
6. O painel admin (`/admin/*`) NÃO DEVE carregar o Pixel da Meta em nenhuma
   tela — rastreamento só acontece nas telas públicas do funil.
7. SE a busca do Pixel ID falhar (erro de rede) OU o pixel não estiver
   configurado, O SISTEMA NÃO DEVE quebrar nem atrasar a Home — o funil
   funciona normalmente, simplesmente sem nenhum pixel carregado.
8. O endpoint de leitura do Pixel ID DEVE ser público (sem autenticação) — um
   Pixel ID não é dado sensível (fica visível no HTML/JS de qualquer site que
   o usa), mesmo padrão já usado para o link do Calendly (spec
   [[calendly-configuravel-admin]]).

---

## Requisito 3 — Atualização dos textos da Home (headline e subheadline)

**User Story:** Como responsável de marketing, quero que a Home reflita a
nova proposta de valor — "estruturar marketing, comercial e vendas do
escritório" e o gargalo que trava o crescimento — para aumentar a conversão
do quiz junto ao público de escritórios (alinhado ao pivô já feito na spec
[[diagnostico-maturidade-escritorio]]).

### Acceptance Criteria (EARS)

1. O headline (`<h1>` do `Hero.jsx`) DEVE ser substituído por: "Diagnóstico
   gratuito de como estruturar marketing, comercial e vendas do seu
   escritório".
2. O subheadline (parágrafo abaixo do headline) DEVE ser substituído por:
   "Descubra em 2 minutos onde está o gargalo que trava o crescimento de seu
   escritório — e receba um plano personalizado no WhatsApp para parar de
   depender de indicação."
3. O selo acima do headline permanece "Diagnóstico gratuito · 2 min" — já
   idêntico ao pedido (visualmente, dado o `textTransform: uppercase` já
   existente); NENHUMA mudança de código é necessária aqui.
4. Das 3 caixinhas de stats, a 1ª ("9 · Perguntas") permanece inalterada; a
   2ª ("2min · Para concluir") e a 3ª ("100% · Gratuito") já batem com o
   texto pedido — NENHUMA mudança de código é necessária no bloco de stats.
5. NENHUMA mudança de layout, CSS ou estrutura de componente é necessária —
   é só substituição de string dentro de `Hero.jsx`.

---

## Fora de escopo (explicitamente não coberto por esta spec)

- Tornar os textos do Hero (selo/headline/subheadline/stats) configuráveis
  pelo admin — decisão confirmada de manter fixos no código nesta spec.
- Atualizar `meta description`/`og:description`/JSON-LD em `index.html`
  (hoje falam de "maturidade comercial da sua empresa") para citar
  "escritório" — não foi pedido; pode ser uma spec/task futura de
  consistência de SEO.
- Alterar textos equivalentes em `Quiz.jsx`, `DiagnosisResult.jsx` ou
  `ThankYou.jsx` que também mencionem "empresa" — fora do que foi pedido
  (só a Home/Hero está em escopo).
- Legenda do PDF anexado no WhatsApp — continua fixa (Requisito 1.7).
- Conversions API (server-side) da Meta — só o pixel client-side padrão
  (Requisito 2, decisão de escopo confirmada).
- Eventos adicionais do Pixel além de `PageView`/`Lead` (ex.:
  `InitiateCheckout` no início do quiz, `CompleteRegistration` na
  qualificação) — extensão futura possível, não coberta agora.
- Múltiplos Pixels (ex. um por campanha) — continua um único Pixel ID
  global, como o Calendly.
- Google Tag Manager, GA4 ou qualquer outra ferramenta de analytics — só o
  Pixel da Meta foi pedido.
- Validar o Pixel ID contra a API da Meta no momento do save — a validação
  de que o pixel funciona só acontece observando o Gerenciador de Eventos da
  Meta depois do deploy, igual ao que já acontece com credenciais de
  terceiros neste projeto (ex. OpenAI key).
