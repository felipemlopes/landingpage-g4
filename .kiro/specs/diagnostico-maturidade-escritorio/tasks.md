# Tasks — Diagnóstico de Maturidade e Crescimento (Escritórios de Advocacia)

Convenção: cada task referencia os critérios de aceite de `requirements.md` que ela implementa (ex. `[R1.1]`).

## Fase 1 — Backend: schema e motor de diagnóstico

- [x] 1.1 Migration `add_type_fields_to_questions_table`: adicionar `type`, `category_slug`, `scored`, `allow_other` em `questions` `[R1.1, R1.4]`
- [x] 1.2 Migration `add_diagnosis_fields_to_leads_table`: adicionar `area_atuacao`, `faturamento_band`, `bottleneck_category`, `level`, `intencao_descoberta`, `intencao_compra`, `fit_investimento` em `leads` `[R2.8, R3.2]`
- [x] 1.3 Atualizar `Question::$fillable`/`$casts` para os novos campos `[R1.1]`
- [x] 1.4 Atualizar `Lead::$fillable`/`$casts` para os novos campos `[R2.8, R3.2]`
- [x] 1.5 Relaxar validação de `options.*.points` em `QuestionController@store/update` para `nullable` quando `scored=false` `[R1.1]` — condicionada também ao `type` (perguntas `texto_livre` não exigem `options`).
- [x] 1.6 Extrair faixas de nível (75/50/25) para uma classe compartilhada (`LevelClassifier`) usada por `DiagnosticReportService::levelFor()` e pelo novo motor `[Design 3.2]`
- [x] 1.7 Criar `App\Services\DiagnosisEngine` com `compute(array $answers): array` (score, level, bottleneck, strengths, attention_points, next_stage, priorities) `[R2.1, R2.2, R2.3, R2.4, R2.5, R2.6]`
- [x] 1.8 Implementar mapeamento pergunta 8 → eixo (tabela da seção 3.3 do design) dentro do `DiagnosisEngine` `[R2.2, R2.3]`
- [x] 1.9 Escrever testes unitários do `DiagnosisEngine` cobrindo: cada faixa de nível, gargalo por múltiplas opções marcadas, fallback quando só "Outra" é marcada, empate de eixos `[R2.1, R2.2, R2.3]` — `tests/Unit/DiagnosisEngineTest.php`, 11 testes / 31 assertions, `php artisan test` verde.

## Fase 2 — Backend: endpoints e seed

- [x] 2.1 Atualizar `LeadController@store` para aceitar o novo formato de `answers`, chamar `DiagnosisEngine`, persistir os campos calculados e devolver `{ lead, diagnosis }` `[R2.7, R2.8]` — **mudança de contrato**: `POST /api/leads` não aceita mais `score` do frontend, ele é sempre calculado no backend.
- [x] 2.2 Criar `LeadController@qualify` + rota `PUT /api/leads/{id}/qualify` (pública, só aceita `intencao_compra`/`fit_investimento`) `[R3.1, R3.2]`
- [x] 2.3 Reescrever `QuestionController::seedDefaults()` com as 11 perguntas do briefing (tipos, eixos e pontuações da seção 2.1 do design) `[R4.5]`
- [x] 2.4 Atualizar `LeadController@exportXlsx` para incluir colunas de nível/gargalo/intenção/fit de investimento `[R4.4]`
- [x] 2.5 Rodar a nova migration em ambiente de desenvolvimento e validar `resetDefaults()` ponta a ponta `[R4.5]` — validado via `php artisan tinker` (script descartável, não versionado): `resetDefaults()` cria as 11 perguntas corretas; `store()` calcula score/nível/gargalo corretamente para um lead de teste; `qualify()` grava intenção/fit; `exportXlsx()` gera o arquivo sem erro; `store()`/`update()` do admin aceitam os novos campos e a validação bloqueia `points` ausente em pergunta pontuada. Lead e pergunta de teste foram removidos ao final — banco local ficou com os mesmos dados de antes (1 lead pré-existente) + as 11 perguntas novas substituindo as 9 genéricas antigas (truncate esperado do `resetDefaults()`).

> A nota que estava aqui ("frontend ainda quebra até a Fase 3/4") não se aplica mais — Fases 3, 4 e 5 já foram implementadas e validadas ponta a ponta (ver abaixo).

## Fase 3 — Frontend: quiz com novos tipos de pergunta

- [x] 3.1 Adaptar `Quiz.jsx` para renderizar 3 tipos de tela (`texto_livre`, `escolha_unica`, `multipla_com_outra`) a partir de `question.type` `[R1.1, R1.7]`
- [x] 3.2 Implementar input de texto livre com validação de não-vazio antes de avançar `[R1.2, R1.8]`
- [x] 3.3 Implementar checkboxes de múltipla escolha + campo condicional para "Outra" `[R1.5, R1.8]`
- [x] 3.4 Trocar o acumulador de respostas de `number[]` para o array de objetos `{ questionId, categorySlug, type, value, points, otherText }` (seção 2.3 do design) `[R1.1]` — `Quiz.jsx` usa esse formato internamente em camelCase; `Landing.jsx` converte para snake_case (`category_slug`, `other_text`) ao chamar a API, para bater com o contrato do backend.
- [x] 3.5 Atualizar `questionsApi`/tipos no frontend para refletir os novos campos vindos de `GET /api/questions` `[R1.1]` — não há tipos estáticos (projeto é JS puro); `Quiz.jsx`/`Qualify.jsx` já consomem `type`/`category_slug`/`scored`/`allow_other` diretamente da resposta.
- [x] Quiz.jsx também passou a filtrar as perguntas com `category_slug` em `intencao_compra`/`fit_investimento` (ficam só para a tela `Qualify`, não aparecem no quiz inicial).

## Fase 4 — Frontend: separar resultado do formulário de contato

- [x] 4.1 Criar `LeadForm.jsx` (extraído da parte de formulário do `ResultForm.jsx` atual) — só nome/whatsapp/email, sem exibir score `[Design 4.3]` — `ResultForm.jsx` foi removido (substituído por `LeadForm.jsx` + `DiagnosisResult.jsx`).
- [x] 4.2 Criar `DiagnosisResult.jsx` — recebe o objeto `diagnosis` vindo da API e renderiza nível, gargalo, pontos fortes, pontos de atenção, próximo estágio e prioridades (reaproveitando o visual de score circular/eixos do `ResultForm.jsx` atual) `[R2.4, R2.5, R2.6]` — backend ganhou o campo `bottleneck_label` (rótulo legível do gargalo) no `DiagnosisEngine::compute()`, usado diretamente aqui.
- [x] 4.3 Criar `Qualify.jsx` — 2 perguntas (intenção e fit de investimento), no mesmo estilo visual do `Quiz.jsx` `[R3.1]`
- [x] 4.4 Atualizar `ThankYou.jsx` com a copy final do briefing + botão de CTA de Calendly `[R3.3, R3.4]`
- [x] 4.5 Adicionar `buildCalendlyLink()` (seção 4.2 do design) e o comportamento de botão desabilitado quando `VITE_CALENDLY_URL` não está configurada `[R3.4, R3.6, R3.7]` — `src/config/calendly.js`.
- [x] 4.6 Reescrever a máquina de estados de `Landing.jsx` para `HERO → QUIZ → LEAD_FORM → RESULT → QUALIFY → THANKYOU`, chamando `POST /api/leads`, depois `PUT /api/leads/:id/qualify`, mantendo o disparo em background de `POST /api/report` no mesmo ponto de hoje `[R2.7, R3.1, R3.2, R3.5]` — o payload legado enviado a `/api/report` (pro prompt da IA) é reconstruído a partir das respostas pontuadas (categoria + pontos), já que o pipeline de IA/PDF/WhatsApp não foi alterado nesta spec.
- [x] 4.7 Adicionar `leadsApi.qualify(id, payload)` em `src/services/api.js` `[R3.2]`
- [x] 4.8 Adicionar `VITE_CALENDLY_URL` em `.env.example` (frontend) `[R3.6]` — deixado vazio (sem URL real ainda, ver pergunta em aberto #2); botão fica desabilitado até ser configurado.

**Bug pego e corrigido durante a validação ponta a ponta:** `Quiz.jsx` monta as respostas em camelCase (`categorySlug`, `otherText`), mas o backend espera snake_case (`category_slug`, `other_text`). `Landing.jsx@handleLeadSubmit` agora converte explicitamente antes de chamar `leadsApi.submit`. Validado com uma simulação completa via `php artisan tinker` despachando requisições HTTP reais (`Kernel::handle`) para `POST /api/leads` e `PUT /api/leads/{id}/qualify` com o payload exato que o frontend produz.

## Fase 5 — Admin

- [x] 5.1 Adicionar seletor de "Tipo" em `QuestionModal.jsx`, ocultando lista de respostas para `texto_livre` `[R4.1]`
- [x] 5.2 Adicionar toggle "Conta para o score de maturidade" (`scored`) em `QuestionModal.jsx`, ocultando inputs de pontos quando desligado `[R4.1]`
- [x] 5.3 Desabilitar edição de `category_slug`/`scored` no `QuestionModal.jsx` quando a pergunta já pertence a um dos 5 eixos fixos, com aviso explicativo `[R4.2]` — o seletor de "Tipo" também fica travado nesse caso (mudar o tipo forçaria `scored=false`, o que quebraria a trava).
- [x] 5.4 Adicionar badges de tipo/eixo por linha em `QuestionsPanel.jsx` `[R4.1]`
- [x] 5.5 Adicionar colunas Nível / Gargalo / Intenção / Fit investimento em `LeadsPanel.jsx`, tratando `null` graciosamente para leads antigos `[R4.3]` — `adminUtils.js` ganhou `axisLabel()`/`levelLabel()` (espelham os rótulos do backend; caem no `scoreLabel()` legado quando `level` é `null`).

**Limitação conhecida, fora do texto literal do Requisito 4.2:** a pergunta 8 (`gargalo_autodeclarado`) não é travada no admin, mas o `DiagnosisEngine::OPTION_AXIS_MAP` (backend) casa o eixo pelo **texto exato** das opções. Se o admin editar o texto dessas opções, o gargalo para de ser inferido corretamente para essa opção (cai no fallback do eixo mais fraco). Não implementado por não estar no escopo escrito do requisito — mencionar ao cliente se isso for um problema na prática.

## Fase 6 — Conteúdo e validação (depende do cliente)

- [ ] 6.1 Validar com o cliente o texto final de "próximo estágio" por nível (4 variações) e "prioridades" por eixo-gargalo (5 variações) — rascunho na seção 3.4 do design `[R2.5, R2.6]` — **bloqueado até o cliente aprovar a copy**
- [ ] 6.2 Obter a URL real de agendamento do Calendly do cliente e configurar `VITE_CALENDLY_URL` em produção `[R3.6]` — **bloqueado até o cliente fornecer o link**
- [ ] 6.3 Confirmar com o cliente o texto exato das 11 perguntas/opções (o briefing enviado já tem o texto quase pronto; revisar pequenas ambiguidades, ex. pergunta 1 "Área de atuação" parece ter vindo com placeholder "Escrever" em vez de instrução real) `[R1.1]`
- [ ] 6.4 Teste manual ponta a ponta do funil completo (Hero → Quiz → LeadForm → Result → Qualify → CTA → Calendly) em ambiente de homologação `[todos]`

---

## Perguntas em aberto para o usuário antes de iniciar a implementação

1. **Copy do diagnóstico** (task 6.1): os textos de "próximo estágio" e "prioridades" no `design.md` são rascunho — quem aprova a versão final, o próprio cliente ou a equipe de marketing da G4?
2. **Link do Calendly** (task 6.2): já existe uma conta/URL de agendamento configurada, ou isso ainda precisa ser criado pelo cliente?
3. **Pergunta 1 do briefing** ("Área de atuação... • Escrever"): confirmar que é para ser um campo de texto livre (entendimento desta spec) e não uma lista de opções que veio incompleta no documento original.
4. **Leads antigos**: já existem leads reais no banco de produção com o formato de resposta atual? Se sim, vale decidir agora se serão migrados/recalculados ou apenas arquivados como estão (esta spec assume a segunda opção, ver seção 8 do design).
