# Requirements — Diagnóstico de Maturidade e Crescimento (Escritórios de Advocacia)

## Contexto e diagnóstico do estado atual

Análise feita no código existente (`src/`, `backend/`) em 2026-08-23, a partir do briefing enviado pelo cliente ("Diagnóstico de Maturidade e Crescimento do seu Escritório").

### Decisões de escopo já confirmadas com o usuário

1. **Este diagnóstico substitui o quiz genérico atual.** Hoje `Question` é 100% livre (qualquer `category` em texto, qualquer número de perguntas, todas do tipo escolha única com pontos) — ver `backend/app/Models/Question.php` e `src/pages/Admin/QuestionModal.jsx`. Isso vira o único funil ativo; a estrutura (tipos de pergunta, eixos fixos, níveis) passa a ser fixa por design, mas o texto/opções continuam editáveis no admin.
2. **O resultado do diagnóstico continua exigindo nome/WhatsApp/e-mail antes de ser exibido** (mesmo comportamento de captura de lead de hoje), diferente da ordem literal do briefing (que mostra o resultado antes de pedir contato). As perguntas de intenção/investimento do briefing (10 e 11) acontecem **depois** do resultado, como no briefing.
3. **O pipeline atual de diagnóstico por IA (OpenAI/Gemini) + PDF + envio automático por WhatsApp é mantido.** O CTA de agendamento no Calendly é **adicionado** como uma etapa nova ao final do funil, não uma substituição.

### O que existe hoje e será alterado

- `src/components/Quiz.jsx`: só suporta perguntas de escolha única (`options[].points`), avança automaticamente ao clicar, sem suporte a texto livre, múltipla escolha ou opção "Outra".
- `src/components/ResultForm.jsx`: mistura, na mesma tela, a exibição do resultado (score, eixos por categoria calculados no navegador) e o formulário de contato — o cálculo de "nível"/"oportunidade" é genérico (`getScoreData`/`getOpportunity` em `ResultForm.jsx`), não fala de gargalo, pontos fortes, pontos de atenção ou próximo estágio.
- `backend/app/Models/Question.php` / `QuestionController.php`: schema `{category, text, options[{label, points}], order, active}`, sem campo de tipo, sem eixo fixo, sem suporte a "não pontua" ou "múltipla escolha".
- `backend/app/Models/Lead.php` / `LeadController.php`: `answers` é um array plano de pontos (`number[]`), sem campos para área de atuação, faturamento, gargalo, nível, intenção ou fit de investimento.
- `backend/app/Services/DiagnosticReportService.php::levelFor()`: já calcula 4 faixas a partir do score (75/50/25), com rótulos genéricos ("Maturidade Avançada" etc.) — a lógica de corte é reaproveitável, só os rótulos/eixos mudam.
- Não existe nenhuma integração com Calendly em nenhum lugar do sistema.
- `src/components/ThankYou.jsx` é a tela final hoje — genérica, fala só de "diagnóstico a caminho do WhatsApp", sem CTA de agendamento.

---

## Requisito 1 — Reformulação do quiz (perguntas fixas do diagnóstico de escritório)

**User Story:** Como advogado(a) respondendo ao diagnóstico, quero responder um conjunto específico de perguntas sobre meu escritório — incluindo perguntas de texto livre, escolha única e múltipla escolha com opção "Outra" — para que o resultado reflita com precisão minha situação.

### Acceptance Criteria (EARS)

1. O SISTEMA DEVE suportar 3 tipos de pergunta: `texto_livre` (resposta digitada, sem opções), `escolha_unica` (uma opção, com ou sem pontuação) e `multipla_com_outra` (uma ou mais opções, incluindo uma opção "Outra" que libera um campo de texto livre).
2. QUANDO o lead responde a pergunta de área de atuação (tipo `texto_livre`), O SISTEMA DEVE aceitar qualquer texto digitado e armazená-lo sem tentar pontuá-lo.
3. QUANDO o lead responde a pergunta de faturamento médio mensal, O SISTEMA DEVE apresentar as 5 faixas do briefing como escolha única, sem que a resposta pontue para o score de maturidade (é uma pergunta de segmentação).
4. QUANDO o lead responde às 5 perguntas de estrutura comercial (responsável pela captação, canal de aquisição, custo por lead, processo de atendimento/conversão, acompanhamento de números), O SISTEMA DEVE atribuir pontos por opção (0/33/66/100, da menos madura para a mais madura) e associar cada uma a um eixo fixo (`geracao_demanda`, `estrutura_comercial`, `controle_custo`, `atendimento_conversao`, `previsibilidade`).
5. QUANDO o lead responde a pergunta "maior dificuldade hoje" (tipo `multipla_com_outra`), O SISTEMA DEVE permitir marcar uma ou mais opções pré-definidas e, SE a opção "Outra" for marcada, ENTÃO O SISTEMA DEVE exigir e armazenar o texto livre digitado.
6. QUANDO o lead responde a pergunta "o que gostaria de descobrir" (tipo `escolha_unica`, não pontuada), O SISTEMA DEVE armazenar a resposta para uso futuro de personalização, sem incluí-la no cálculo do score.
7. O SISTEMA DEVE manter a barra de progresso e a navegação sequencial já existentes no `Quiz.jsx`, adaptando-as para os novos tipos de pergunta (ex.: exibir um campo de texto ou checkboxes em vez de um botão único quando o tipo não for `escolha_unica` de avanço automático).
8. SE o lead tentar avançar em uma pergunta obrigatória sem preencher/marcar nada, ENTÃO O SISTEMA NÃO DEVE permitir avançar, exibindo indicação visual do campo pendente.

---

## Requisito 2 — Motor de diagnóstico (nível, gargalo, pontos fortes/atenção, próximo estágio, prioridades)

**User Story:** Como lead que respondeu o quiz, quero ver um diagnóstico claro do estágio de maturidade do meu escritório — incluindo meu principal gargalo, pontos fortes, pontos de atenção e prioridades — para entender exatamente o que fazer a seguir.

### Acceptance Criteria (EARS)

1. QUANDO todas as perguntas pontuadas (Requisito 1.4) são respondidas, O SISTEMA DEVE calcular um score de 0 a 100 (média dos pontos dos 5 eixos) e classificá-lo em um dos 4 níveis do briefing: Nível 1 — Dependente de Indicação (score < 25), Nível 2 — Em Estruturação (25–49), Nível 3 — Em Crescimento (50–74), Nível 4 — Previsível (≥ 75).
2. O SISTEMA DEVE calcular o "principal gargalo" priorizando a resposta da pergunta de múltipla escolha (Requisito 1.5): entre os eixos referenciados pelas opções marcadas (ignorando "Outra"), O SISTEMA DEVE escolher o de menor pontuação nas respostas do lead.
3. SE o lead só marcou "Outra" na pergunta de maior dificuldade (sem nenhuma opção mapeável a um eixo), ENTÃO O SISTEMA DEVE usar como gargalo principal o eixo de menor pontuação entre os 5 eixos pontuados.
4. O SISTEMA DEVE identificar até 2 "pontos fortes" (eixos com pontuação ≥ 66, ordenados do maior para o menor) e até 2 "pontos de atenção" (eixos com menor pontuação, excluindo o eixo já apontado como gargalo principal para não repetir a mesma informação).
5. O SISTEMA DEVE apresentar um texto de "próximo estágio" específico para o nível atual do lead (4 variações — a do Nível 4 deve falar de otimização contínua, não de "subir de nível").
6. O SISTEMA DEVE apresentar de 2 a 3 "prioridades recomendadas", combinando uma prioridade geral do nível atual com uma prioridade específica do eixo identificado como gargalo principal.
7. O SISTEMA DEVE calcular esse diagnóstico no backend (não apenas no navegador), devolvendo o resultado completo na resposta da API que salva o lead, para que o cálculo seja auditável, consistente e reutilizável (ex. no prompt da IA do relatório em PDF).
8. O SISTEMA DEVE persistir no registro do lead: `score`, `level` (1–4), `bottleneck_category` (eixo do gargalo principal), além das respostas brutas.

---

## Requisito 3 — Perguntas de qualificação pós-resultado e CTA de agendamento (Calendly)

**User Story:** Como responsável comercial da G4, quero entender o nível de interesse e a capacidade de investimento do lead logo após ele ver o diagnóstico, e oferecer a ele um link para agendar uma call, para priorizar o atendimento comercial pelos leads mais qualificados.

### Acceptance Criteria (EARS)

1. QUANDO o resultado do diagnóstico é exibido, O SISTEMA DEVE em seguida apresentar a pergunta de "nível de interesse" (4 opções do briefing) e, depois dela, a pergunta de "encaixe do investimento" (4 opções, mencionando o valor de referência informado pelo cliente), sem que essas respostas alterem o score de maturidade já calculado.
2. O SISTEMA DEVE persistir as respostas de intenção e de fit de investimento no registro do lead, associadas ao lead já criado no Requisito 2 (não deve exigir recriar o lead).
3. QUANDO o lead conclui as duas perguntas de qualificação, O SISTEMA DEVE exibir uma tela final com o texto de oferta do briefing ("Quer entender como levar seu escritório para o próximo nível?") e um botão "Quero analisar meu escritório".
4. QUANDO o lead clica no botão de CTA final, O SISTEMA DEVE abrir o link de agendamento do Calendly (em nova aba), pré-preenchido com nome e e-mail do lead quando o Calendly suportar via parâmetros de URL.
5. O SISTEMA DEVE manter, em paralelo e sem bloquear a exibição do CTA, o disparo em background do diagnóstico por IA + PDF + envio por WhatsApp já existente (`/api/report`), que continua acontecendo logo após a criação do lead.
6. A URL do Calendly DEVE ser configurável via variável de ambiente do frontend, seguindo o padrão já usado para `VITE_API_URL`.
7. SE a variável de ambiente do Calendly não estiver configurada, ENTÃO O SISTEMA DEVE ocultar ou desabilitar o botão de CTA final com uma mensagem clara, em vez de abrir um link quebrado.

---

## Requisito 4 — Suporte no painel admin

**User Story:** Como administrador da G4, quero editar o texto e as opções das perguntas do diagnóstico e ver o nível/qualificação de cada lead na lista, para ajustar a copy do quiz e priorizar quem contatar primeiro.

### Acceptance Criteria (EARS)

1. QUANDO o administrador cria ou edita uma pergunta na aba **Perguntas**, O SISTEMA DEVE permitir escolher o tipo (`texto_livre` / `escolha_unica` / `multipla_com_outra`) e, para os tipos com opções, DEVE ocultar o campo de pontos quando a pergunta não pontuar para o score.
2. SE a pergunta pertencer a um dos 5 eixos fixos do score (Requisito 1.4), ENTÃO O SISTEMA DEVE impedir a alteração do eixo (`category_slug`) e do campo "pontua para o score" pelo admin, exibindo um aviso de que essa mudança quebraria o cálculo do diagnóstico; o texto da pergunta e das opções continua livremente editável.
3. QUANDO o administrador visualiza a aba **Leads**, O SISTEMA DEVE exibir, além das colunas já existentes, o nível de maturidade (badge Nível 1–4), o gargalo principal, a intenção declarada e o fit de investimento de cada lead.
4. O SISTEMA DEVE incluir as novas colunas (nível, gargalo, intenção, fit de investimento) na exportação XLSX já existente.
5. QUANDO o administrador usa "Restaurar perguntas padrão", O SISTEMA DEVE recriar exatamente as 11 perguntas do briefing (com seus tipos, eixos e pontuações corretos), substituindo o seed genérico atual.

---

## Fora de escopo (explicitamente não coberto por esta spec)

- Reescrever a copy final de marketing (textos de "próximo estágio" e "prioridades recomendadas" por combinação de nível/gargalo) — esta spec define a **estrutura e o mecanismo** de cálculo; o texto definitivo de cada variação é um entregável de conteúdo a ser validado com o cliente (rascunho proposto em `design.md`).
- Qualquer integração via API do Calendly (ex. webhook de agendamento confirmado, leitura de disponibilidade real). O escopo é apenas o link de agendamento pré-preenchido por query string.
- Multi-tenant / múltiplos diagnósticos para nichos diferentes de escritório de advocacia (o quiz genérico por nicho deixa de existir nesta spec, conforme decisão de escopo).
- Alterar o pipeline de IA (OpenAI/Gemini) além de passar a receber o objeto de diagnóstico já calculado como contexto adicional do prompt — isso fica marcado como melhoria opcional nas tasks, não obrigatória.
