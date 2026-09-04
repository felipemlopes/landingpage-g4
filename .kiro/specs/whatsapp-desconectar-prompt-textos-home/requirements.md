# Requirements — Desconectar WhatsApp, Prompt da IA e Textos da Home configuráveis pelo admin

## Contexto e diagnóstico do estado atual

Análise feita no código existente em 2026-09-04.

- **WhatsApp**: `WhatsAppProviderInterface` (`backend/app/Services/WhatsApp/WhatsAppProviderInterface.php`)
  hoje só declara `connect()` — não existe `disconnect()` na interface, nos
  dois providers (`EvolutionProvider`, `OfficialCloudApiProvider`) nem no
  `WhatsAppController`. Na tela de Integrações (`IntegracoesPanel.jsx`,
  bloco "Status / conexão", linhas 437-483) só existem os botões "Conectar"
  e "Atualizar status" — não há como encerrar uma conexão já pareada sem
  acesso direto à Evolution API (ex. via painel dela) ou, no caso da API
  oficial, sem sobrescrever o token por outro incorreto só para invalidar.
- **Prompt da IA**: o prompt enviado à OpenAI/Gemini está fixo em código, em
  `PromptBuilder::buildPrompt()` (`backend/app/Services/AI/PromptBuilder.php:37-63`),
  trait compartilhada por `OpenAIService` e `GeminiService`. Hoje só a API
  key da OpenAI é editável pelo admin (spec
  [[openai-key-configuravel-admin]]) — o texto do prompt em si exige editar
  código e fazer deploy para mudar tom, estrutura ou instruções.
- **Textos da Home**: `Hero.jsx` tem o selo, o headline (3 partes: texto,
  trecho destacado em dourado, texto), o subheadline, as 3 caixinhas de
  stats (`value`/`label`) e o texto do CTA (botão + legenda abaixo) todos
  fixos em JSX (`src/components/Hero.jsx:85-178`). A spec
  [[whatsapp-pixel-meta-textos-hero]] (2026-09-01) já atualizou esses
  textos, mas decidiu explicitamente mantê-los fixos no código
  ("Fora de escopo": *"Tornar os textos do Hero configuráveis pelo admin —
  decisão confirmada de manter fixos no código nesta spec"*). Esta spec
  reverte essa decisão a pedido do usuário.
- O projeto já resolve repetidamente o mesmo problema — "valor trocável sem
  deploy" — com o mesmo padrão: tabela singleton
  (`firstOrCreate(['id' => 1])`), controller com `index`/`show` + `update`,
  card novo em `IntegracoesPanel.jsx` ou painel próprio. Esta spec aplica o
  padrão já validado às três mudanças pedidas, sem inventar mecanismo novo.

### Decisões de escopo propostas nesta spec (a validar antes da implementação)

Diferente das specs anteriores (onde o escopo já vinha confirmado em
conversa antes de escrever `requirements.md`), esta é uma spec de
planejamento pedida para revisão — nenhuma decisão abaixo foi implementada
ou confirmada ainda. Marcadas aqui para o usuário validar/ajustar antes de
qualquer código ser escrito:

1. **Desconectar** tem semântica diferente por provider (Requisito 1): na
   Evolution API existe uma sessão pareada de verdade (like WhatsApp Web) —
   desconectar faz *logout* da instância, mantendo-a criada para reconectar
   com um novo QR Code. Na API oficial da Meta não existe "sessão" — é só
   um token de longa duração — então "desconectar" aqui é proposto como
   **apagar as credenciais salvas** (token, Phone Number ID, WABA ID),
   forçando reconfiguração manual para reconectar.
2. O **prompt da IA** vira editável como um *template* com variáveis
   (`{nome}`, `{pontuacao}`, `{nivel}`, `{respostas}`, `{marca}`), no mesmo
   molde já usado para a mensagem do WhatsApp (spec
   [[whatsapp-pixel-meta-textos-hero]], Requisito 1) — não um campo de texto
   livre sem estrutura, para preservar a substituição automática dos dados
   do lead.
3. Nem todo texto do site vira editável — só o bloco **Hero** da Home (selo,
   headline, subheadline, stats, CTA), que é o que já foi tocado na spec
   anterior. Textos de `Quiz.jsx`, `DiagnosisResult.jsx`, `ThankYou.jsx` etc.
   ficam fora, a menos que o usuário confirme que quer incluí-los.
4. `AI_PROVIDER`, `OPENAI_MODEL` e a configuração do Gemini continuam fora
   do admin (mesma exclusão já aplicada na spec
   [[openai-key-configuravel-admin]]) — só o texto do prompt fica editável,
   não o provider/modelo usado.

---

## Requisito 1 — Admin desconecta o WhatsApp pela tela de Integrações

**User Story:** Como admin, quero um botão para desconectar o WhatsApp
ativo, para poder trocar de número/conta ou encerrar o envio automático sem
depender de acesso direto à Evolution API ou de sobrescrever credenciais às
cegas.

### Acceptance Criteria (EARS)

1. QUANDO o admin está na tela de Integrações E o WhatsApp está conectado
   (`status.connected === true`), O SISTEMA DEVE exibir um botão
   "Desconectar" junto dos botões "Conectar"/"Atualizar status" existentes.
2. QUANDO o provider ativo é **Evolution** E o admin confirma a
   desconexão, O SISTEMA DEVE encerrar a sessão pareada (logout da
   instância) na Evolution API, mantendo a instância criada — um novo
   "Conectar" deve gerar um QR Code novo, sem recriar a instância do zero.
3. QUANDO o provider ativo é **API Oficial (Meta)** E o admin confirma a
   desconexão, O SISTEMA DEVE apagar o Access Token, o Phone Number ID e o
   WABA ID salvos — o formulário de credenciais deve voltar ao estado
   "nunca configurado".
4. QUANDO a desconexão é confirmada, O SISTEMA DEVE exigir uma confirmação
   explícita do admin antes de executar (modal, reaproveitando o
   `ConfirmModal` já usado em outras ações destrutivas do painel) — a ação
   não deve ser irreversível de forma silenciosa/acidental.
5. QUANDO a desconexão termina (sucesso ou falha), O SISTEMA DEVE atualizar
   o status exibido (`Conectado`/`Desconectado` + detalhe) sem exigir que o
   admin clique manualmente em "Atualizar status".
6. SE o WhatsApp já está desconectado, O SISTEMA NÃO DEVE exibir o botão
   "Desconectar" habilitado — evita uma chamada sem propósito (mesmo
   critério já usado para desabilitar "Conectar" quando há alterações não
   salvas, `IntegracoesPanel.jsx:472`).
7. A ação de desconectar NÃO DEVE apagar o histórico de leads, relatórios
   já gerados ou qualquer outro dado — afeta somente a conexão/credenciais
   do WhatsApp.

---

## Requisito 2 — Admin edita o prompt usado para gerar o relatório de IA

**User Story:** Como admin, quero editar o prompt enviado à IA (tom,
estrutura, instruções), para ajustar a qualidade/estilo do relatório
gerado sem depender de deploy.

### Acceptance Criteria (EARS)

1. QUANDO o admin abre a tela de Integrações, O SISTEMA DEVE exibir um
   campo com o template de prompt atualmente salvo — preenchido com o
   template padrão (o prompt atual) quando nunca foi customizado, igual ao
   padrão já usado para a mensagem do WhatsApp.
2. O SISTEMA DEVE suportar as variáveis `{nome}`, `{pontuacao}`, `{nivel}`,
   `{respostas}` (lista formatada de categoria + resposta escolhida) e
   `{marca}` dentro do template, substituídas pelos valores reais no
   momento da geração do relatório.
3. QUANDO o admin salva um template novo e não vazio, O SISTEMA DEVE
   persistir esse valor e usá-lo a partir da próxima geração de relatório
   (qualquer provider — OpenAI ou Gemini), sem deploy ou reinício.
4. SE o admin salvar o campo em branco, O SISTEMA DEVE voltar a usar o
   template padrão embutido no backend — funciona como "restaurar padrão",
   igual ao comportamento já existente para a mensagem do WhatsApp
   (Requisito 1.4 da spec [[whatsapp-pixel-meta-textos-hero]]).
5. ENQUANTO o admin edita o template, O SISTEMA DEVE mostrar um preview ao
   vivo com valores de exemplo substituindo as variáveis, para conferir o
   resultado antes de salvar.
6. SE o template ultrapassar um limite de caracteres (proposto: 6000,
   equivalente a uma margem confortável de tokens de entrada), O SISTEMA
   DEVE rejeitar o salvamento com uma mensagem de erro, mantendo o template
   salvo anteriormente inalterado.
7. Esta mudança NÃO DEVE alterar `AI_PROVIDER`, `OPENAI_MODEL` nem a
   configuração do Gemini — continuam vindo do `.env`, fora de escopo.
8. Um template mal formado (ex. HTML inválido, instruções contraditórias)
   pode gerar um relatório de qualidade ruim, mas NÃO DEVE quebrar o
   pipeline — o tratamento de erro/fallback já existente em
   `DiagnosticReportService::build()` (`backend/app/Services/DiagnosticReportService.php:55-60`)
   continua válido sem mudanças.

---

## Requisito 3 — Admin edita os textos da Home (Hero) pelo painel

**User Story:** Como responsável de marketing, quero editar o selo,
headline, subheadline, stats e CTA da Home pelo painel, para testar
variações de copy e ajustar a proposta de valor sem depender de deploy.

### Acceptance Criteria (EARS)

1. QUANDO a Home (`/`) carrega, O SISTEMA DEVE buscar o conteúdo
   configurado e exibi-lo no Hero; SE nenhum valor foi configurado (ou a
   busca falhar), O SISTEMA DEVE exibir os textos atuais como padrão — a
   Home nunca fica com texto vazio ou quebrada por causa desta função.
2. Os seguintes campos DEVEM ser editáveis independentemente, cada um com
   seu próprio valor padrão (o texto atual do código) usado como fallback:
   - Selo acima do headline (hoje "Diagnóstico gratuito · 2 min");
   - Headline, em 3 partes — texto inicial, trecho destacado em dourado,
     texto final (hoje "Diagnóstico gratuito de como estruturar" / "marketing,
     comercial e vendas" / "do seu escritório") — preservando o destaque
     visual em dourado no trecho do meio;
   - Subheadline (parágrafo abaixo do headline);
   - As 3 caixinhas de stats, cada uma com `valor` + `rótulo` (hoje "9" /
     "Perguntas", "2min" / "Para concluir", "100%" / "Gratuito");
   - Texto do botão principal (hoje "Começar diagnóstico");
   - Legenda abaixo do botão (hoje "Sem compromisso · Resultado imediato").
3. QUANDO o admin salva os textos, O SISTEMA DEVE persistir os valores e
   refletir a mudança na Home no próximo carregamento, sem deploy.
4. QUANDO o admin limpa um campo individual e salva, O SISTEMA DEVE voltar
   a usar o valor padrão daquele campo (mesmo padrão "vazio restaura
   padrão" já usado no template do WhatsApp).
5. A tela de edição DEVE mostrar um preview aproximado do Hero (mesma
   hierarquia visual — selo, headline com destaque dourado, subheadline,
   stats, CTA) para o admin conferir o resultado antes de salvar.
6. Nenhuma mudança de layout, CSS ou estrutura de componente fora da leitura
   dos textos é necessária — o Hero continua com a mesma aparência,
   variando apenas o conteúdo textual.
7. O endpoint de leitura do conteúdo da Home DEVE ser público (sem
   autenticação) — os textos já são visíveis a qualquer visitante no HTML
   da página, mesmo padrão já usado para o Calendly e o Pixel da Meta.

---

## Fora de escopo (explicitamente não coberto por esta spec)

- Desconectar/reconfigurar qualquer coisa além do WhatsApp (ex. Pixel da
  Meta, Calendly) — fora do pedido.
- Trocar `AI_PROVIDER` (openai | gemini) ou `OPENAI_MODEL` pelo admin —
  continuam no `.env`.
- Editar a legenda fixa do PDF anexado no WhatsApp (`'📊 Diagnóstico
  Comercial ' . config('app.name')`, `DiagnosticReportService.php:99`) —
  não faz parte do prompt da IA nem da mensagem de texto, já é escopo
  explicitamente excluído desde a spec [[whatsapp-pixel-meta-textos-hero]].
- Editor de texto rico (bold/itálico arbitrário, múltiplas cores) para os
  textos da Home — os campos são texto simples; o único destaque de cor
  (dourado no meio do headline) continua sendo estrutural (3 campos fixos),
  não um editor WYSIWYG.
- Editar textos de `Quiz.jsx`, `Qualify.jsx`, `DiagnosisResult.jsx` ou
  `ThankYou.jsx` — só o Hero da Home está em escopo (ver decisão de escopo
  proposta nº 3).
- Múltiplas versões/idiomas dos textos (ex. A/B test, i18n) — continua um
  único conjunto de textos, como hoje.
- Validar o template do prompt contra a API da OpenAI/Gemini no momento do
  save (chamada de teste) — a validação de que o prompt "funciona bem" só
  acontece observando o próximo relatório gerado de verdade.
