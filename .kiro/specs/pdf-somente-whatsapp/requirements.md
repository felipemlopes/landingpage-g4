# Requirements — Remover download automático do PDF (entrega só por WhatsApp)

## Contexto e diagnóstico do estado atual

Análise feita no código existente em 2026-08-29.

- O backend já gera o diagnóstico em PDF e o envia por WhatsApp automaticamente
  — pipeline implementado na spec [[seo-ia-whatsapp]] (`GenerateDiagnosticReportJob`
  → `DiagnosticReportService::deliverViaWhatsApp`). Isso **não muda** nesta spec.
- O único ponto problemático é no frontend: em `handleLeadSubmit` (`src/pages/Landing.jsx:66-83`),
  assim que o polling de `reportApi.generate()` resolve, se `res.pdf` existir o
  código chama `reportApi.download(res.pdf, res.filename)` **incondicionalmente**,
  disparando um download de arquivo no navegador do lead — mesmo quando o envio
  por WhatsApp já teve sucesso.
- `ThankYou.jsx` já exibe o texto "seu diagnóstico completo também está a caminho
  do seu WhatsApp" (linha 59), mas hoje esse texto convive com um download forçado
  que acontece em paralelo, o que é confuso e desnecessário.
- Não existe hoje nenhum botão de download manual em nenhuma tela pública — o
  único consumidor de `reportApi.download()` é essa chamada automática.
- `GET /api/report/{id}` (polling) já retorna `{ status, whatsapp_sent, pdf, filename, error }`
  — o campo `whatsapp_sent` (booleano) já existe e é suficiente para decidir
  se o WhatsApp funcionou ou não, sem nenhuma mudança de backend.

Esta spec formaliza uma decisão do usuário (respondida em 2026-08-29): quando o
envio por WhatsApp falhar, deve existir um botão de download manual como
fallback — o lead não deve ficar sem receber o diagnóstico que acabou de gerar
por nenhum canal.

Amends: o Requisito 3.5 da spec [[seo-ia-whatsapp]] ("o sistema deve continuar
retornando o PDF em base64 (...) para download imediato no navegador,
independentemente do resultado do envio por WhatsApp") passa a valer apenas
como **fallback condicional** (Requisito 3 abaixo), não mais como download
automático incondicional.

---

## Requisito 1 — Não baixar o PDF automaticamente

**User Story:** Como lead que acabou de preencher o formulário, não quero que
meu navegador force um download de arquivo assim que envio o quiz, para que a
experiência pareça intencional (recebo meu diagnóstico no WhatsApp) e não
dispare bloqueios de pop-up/download do navegador nem gere um arquivo solto na
pasta de Downloads sem eu ter pedido.

### Acceptance Criteria (EARS)

1. QUANDO o relatório termina de ser gerado (`status: 'done'`) E o envio por
   WhatsApp foi bem-sucedido (`whatsapp_sent: true`), O SISTEMA NÃO DEVE
   iniciar nenhum download de arquivo no navegador.
2. O SISTEMA DEVE continuar exibindo a tela de resultado (`DiagnosisResult`)
   imediatamente após o envio do formulário, sem esperar a geração do PDF/envio
   de WhatsApp — o comportamento "fire-and-forget" atual (`reportApi.generate`
   disparado em background, sem `await` bloqueando a navegação) é preservado.
3. QUANDO a chamada a `reportApi.generate` falha por completo (erro de rede,
   timeout do polling, `status: 'failed'`), O SISTEMA DEVE registrar o erro no
   console (comportamento atual, preservado) e NÃO DEVE iniciar nenhum download.

---

## Requisito 2 — Entrega via WhatsApp como único canal automático (sem mudança de comportamento)

**User Story:** Como lead, quero receber meu diagnóstico em PDF diretamente no
WhatsApp informado no formulário, sem precisar fazer nada além de preencher o
formulário.

### Acceptance Criteria (EARS)

1. O SISTEMA DEVE continuar disparando `DiagnosticReportService::deliverViaWhatsApp`
   a partir de `GenerateDiagnosticReportJob`, sem nenhuma alteração de lógica —
   esse pipeline já existe e já funciona (spec [[seo-ia-whatsapp]], Requisito 3).
2. Este requisito documenta comportamento pré-existente — nenhuma mudança de
   backend é necessária para atendê-lo; existe aqui só para deixar explícito
   que a fila/job/serviço de WhatsApp não são tocados por esta spec.

---

## Requisito 3 — Fallback de download manual quando o WhatsApp falha

**User Story:** Como lead cujo envio por WhatsApp falhou (número inválido,
provider desconectado, erro do provider), quero uma forma alternativa de obter
meu PDF, para não ficar sem o diagnóstico que acabei de gerar.

### Acceptance Criteria (EARS)

1. QUANDO o polling de `GET /api/report/{id}` retorna `status: 'done'` E
   `whatsapp_sent: false`, O SISTEMA DEVE exibir um botão/link discreto
   "Baixar PDF" em alguma tela do funil que o lead ainda vá visitar.
2. QUANDO `whatsapp_sent: true`, O SISTEMA NÃO DEVE exibir nenhum botão de
   download em nenhuma tela.
3. QUANDO o botão "Baixar PDF" é clicado, O SISTEMA DEVE baixar o PDF
   reaproveitando o base64 já recebido no polling (`reportApi.download`), sem
   nenhuma nova chamada de rede.
4. SE a geração falhar por completo (`status: 'failed'`, ex.: erro ao montar o
   PDF em si — não é possível gerar o arquivo), O SISTEMA DEVE manter o
   comportamento atual (log no console) e NÃO DEVE oferecer botão de download,
   pois não há PDF disponível nesse caso.
5. O botão de download, quando exibido, DEVE aparecer de forma discreta (texto
   pequeno/link, não um CTA primário) e NÃO DEVE competir visualmente com o CTA
   principal do funil (ex. "Quero analisar meu escritório" na tela de
   agradecimento).
6. Como a geração do relatório pode terminar depois que o lead já navegou para
   uma tela seguinte (é assíncrona, fire-and-forget, pode levar até ~80s), O
   SISTEMA DEVE guardar o resultado (`reportResult`) em um estado que sobrevive
   à troca de telas dentro da mesma sessão do funil, para que o botão apareça
   assim que o resultado chegar, mesmo que isso aconteça depois da troca de tela.

---

## Fora de escopo (explicitamente não coberto por esta spec)

- Mudar a lógica de envio de WhatsApp em si (o Requisito 2 só documenta o que
  já existe).
- Alterar o formato/conteúdo do PDF ou do template `resources/views/pdf/report.blade.php`.
- Retry automático de WhatsApp — continua restrito ao botão "Reenviar" já
  existente no painel admin (`LeadsPanel.jsx` → `POST /admin/leads/{id}/resend-report`).
- Remover o campo `pdf`/`filename` da resposta de `GET /api/report/{id}` — ele
  continua sendo retornado pelo backend; só deixa de ser consumido
  incondicionalmente pelo frontend.
- Persistir/mostrar esse botão de fallback fora da sessão atual do navegador
  (ex.: se o lead fechar a aba antes do resultado chegar, a recuperação
  continua sendo o reenvio manual pelo admin — já existente).
