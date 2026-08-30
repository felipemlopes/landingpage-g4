# Design — Remover download automático do PDF (entrega só por WhatsApp)

## Visão geral

Mudança é **100% frontend**, um único fluxo de estado. Nada muda no backend:
`DiagnosticReportService`, `GenerateDiagnosticReportJob`, `ReportController` e a
resposta de `GET /api/report/{id}` continuam exatamente como estão hoje — já
carregam tudo que a UI precisa (`status`, `whatsapp_sent`, `pdf`, `filename`, `error`).

O problema é só um: `Landing.jsx` trata a resolução do polling como "sempre
baixar", em vez de "guardar o resultado e deixar a UI decidir o que fazer com
ele".

## Fluxo de dados (antes → depois)

**Antes:**
```
handleLeadSubmit()
  └─ reportApi.generate(...).then(res => {
       if (res.pdf) reportApi.download(res.pdf, res.filename)   // ← sempre baixa
     })
```

**Depois:**
```
Landing (estado: reportResult = null | { pdf, filename, whatsapp_sent } | { failed: true })
  └─ handleLeadSubmit()
       └─ reportApi.generate(...)
            .then(res  => setReportResult(res))          // não baixa nada aqui
            .catch(err => { console.error(...); setReportResult({ failed: true }) })
  └─ <ThankYou reportResult={reportResult} ... />
       └─ if (reportResult?.pdf && reportResult.whatsapp_sent === false)
            renderiza botão "Baixar PDF" → onClick: reportApi.download(reportResult.pdf, reportResult.filename)
```

`Landing` é o componente pai que fica montado durante toda a navegação entre
`RESULT → QUALIFY → THANKYOU` (só a `view` interna muda, `Landing` não
desmonta). Por isso um `useState` em `Landing` é suficiente para "sobreviver" à
troca de telas exigida pelo Requisito 3.6 — não precisa de contexto global,
localStorage nem nova rota de polling na tela de agradecimento: quando a
Promise do polling resolve (a qualquer momento, em qualquer tela em que o lead
esteja), `setReportResult` dispara um re-render e, se `ThankYou` for a view
ativa naquele momento, o botão aparece **reativamente**, sem que o usuário
precise recarregar nada.

Caso o resultado só chegue depois que o lead já está no `ThankYou` (cenário
comum, já que a geração pode levar até ~80s e o funil Quiz→Form→Result→Qualify
costuma ser mais rápido que isso): o botão simplesmente aparece sozinho na tela
em que o lead já estiver, sem nenhuma ação adicional dele.

Caso o lead feche a aba antes da Promise resolver: não há nada a fazer no
frontend — o PDF já está persistido em `storage/app/reports/{lead_id}.pdf` no
backend, e a recuperação é o botão "Reenviar" já existente no admin (fora de
escopo, ver requirements.md).

## Onde exibir o botão de fallback: `ThankYou`, não `DiagnosisResult`

Decisão: o botão aparece em `ThankYou.jsx`, não em `DiagnosisResult.jsx`.

Motivos:
1. `ThankYou` é a última tela do funil — é onde o lead tende a ficar mais
   tempo / é a "tela final" da sessão, maximizando a chance de o resultado já
   ter chegado quando o botão precisar aparecer.
2. `ThankYou` já tem a frase "seu diagnóstico completo também está a caminho do
   seu WhatsApp" (linha 59) — é o lugar natural para complementar com "não
   recebeu? baixe aqui" condicionalmente, sem introduzir um novo bloco de UI
   em `DiagnosisResult`.
3. Mantém `DiagnosisResult.jsx` sem nenhuma alteração — ele já é "burro"
   (só renderiza o `diagnosis` calculado no backend) e não precisa saber nada
   sobre o status do PDF/WhatsApp.

## Alterações por arquivo

### `src/pages/Landing.jsx`
- Novo estado: `const [reportResult, setReportResult] = useState(null);`
- No bloco `reportApi.generate({...})`:
  - `.then((res) => setReportResult(res))` substitui o `if (res?.pdf) reportApi.download(...)` atual.
  - `.catch((err) => { console.error('Erro ao gerar relatório:', err); setReportResult({ failed: true }); })`
- `<ThankYou name={leadName} email={leadEmail} reportResult={reportResult} />` — nova prop.

### `src/components/ThankYou.jsx`
- Nova prop `reportResult`.
- Condição de exibição: `reportResult?.pdf && reportResult.whatsapp_sent === false`.
- Elemento discreto (link/botão texto, não `.cta-btn` primário) logo abaixo do
  parágrafo existente "seu diagnóstico completo também está a caminho do seu
  WhatsApp", algo como:
  ```jsx
  {reportResult?.pdf && reportResult.whatsapp_sent === false && (
    <button type="button" onClick={() => reportApi.download(reportResult.pdf, reportResult.filename)} className="link-sutil">
      Não recebeu? Baixar PDF
    </button>
  )}
  ```
- Import de `reportApi` de `../services/api` (novo import neste arquivo).

### `src/services/api.js`
- **Nenhuma mudança.** `reportApi.download()` e o formato de retorno de
  `reportApi.generate()` (`{ pdf, filename, whatsapp_sent }`, já documentado no
  JSDoc existente) já são exatamente o que este design precisa.

### Backend (`ReportController`, `DiagnosticReportService`, `GenerateDiagnosticReportJob`)
- **Nenhuma mudança.** Confirmado pelo Requisito 2.

## Casos de borda considerados

| Cenário | Comportamento |
|---|---|
| WhatsApp enviado com sucesso | Nenhum download, nenhum botão — só a mensagem já existente no `ThankYou`. |
| WhatsApp falha (provider fora do ar, número inválido) | Botão "Baixar PDF" aparece no `ThankYou` assim que `reportResult` resolver com `whatsapp_sent: false`. |
| WhatsApp desabilitado (nenhum provider configurado) | Mesmo caminho do caso anterior — `whatsapp_sent` já vem `false` do backend hoje (`DiagnosticReportService::isWhatsAppEnabled()` retorna `false` → job nem tenta enviar), então o botão aparece corretamente sem precisar de um terceiro estado. |
| Geração do relatório falha por completo (`status: 'failed'`) | `reportApi.generate` rejeita a Promise → `catch` seta `{ failed: true }` → `reportResult.pdf` é `undefined` → nenhum botão aparece (não há PDF para oferecer). Mesmo `console.error` de hoje é preservado. |
| Lead reenvia formulário duas vezes (não deveria acontecer, mas por segurança) | `reportResult` é sobrescrito pela chamada mais recente — comportamento já implícito no `useState`, sem necessidade de lógica extra. |

## Por que não usar `DiagnosisResult`, um toast global, ou polling contínuo na tela `ThankYou`

- **Toast/notificação global:** exigiria um sistema de notificação novo no
  projeto (não existe hoje) só para um caso relativamente raro (falha de
  WhatsApp). O botão condicional na tela final é mais simples e não introduz
  dependência nova.
- **Polling contínuo dentro de `ThankYou`:** desnecessário — o polling já
  acontece uma vez dentro de `reportApi.generate()` (chamado em `Landing`) e
  seu resultado já propaga via prop/estado React normal. Duplicar o polling
  dentro de `ThankYou` adicionaria complexidade e uma segunda fonte de verdade
  sem necessidade.
