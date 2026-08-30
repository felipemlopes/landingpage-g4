# Tasks — Remover download automático do PDF (entrega só por WhatsApp)

Convenção: cada task referencia os critérios de aceite de `requirements.md` que
ela implementa (ex. `[R1.1]`). Nenhuma task de backend é necessária — ver
Requisito 2.

## Fase 1 — Frontend

- [x] 1.1 `Landing.jsx`: adicionar `const [reportResult, setReportResult] = useState(null);` `[R3.6]`
- [x] 1.2 `Landing.jsx`: no `.then()` de `reportApi.generate(...)`, trocar o
      `if (res?.pdf) reportApi.download(...)` por `setReportResult(res)` `[R1.1, R1.2]`
- [x] 1.3 `Landing.jsx`: no `.catch()` existente, além do `console.error` atual,
      chamar `setReportResult({ failed: true })` `[R1.3, R3.4]`
- [x] 1.4 `Landing.jsx`: passar `reportResult` como prop para `<ThankYou />` `[R3.6]`
- [x] 1.5 `ThankYou.jsx`: aceitar a prop `reportResult` e importar `reportApi` de `../services/api` `[R3.1]`
- [x] 1.6 `ThankYou.jsx`: renderizar botão/link discreto "Não recebeu? Baixar PDF"
      quando `reportResult?.pdf && reportResult.whatsapp_sent === false`, logo
      abaixo do parágrafo "seu diagnóstico completo também está a caminho do seu
      WhatsApp" `[R3.1, R3.2, R3.5]`
- [x] 1.7 `ThankYou.jsx`: `onClick` do botão chama `reportApi.download(reportResult.pdf, reportResult.filename)` `[R3.3]`

## Fase 2 — Validação manual

- [ ] 2.1 Fluxo feliz: completar o quiz com um provider de WhatsApp conectado e
      funcionando; confirmar que **nenhum** download automático ocorre em
      nenhuma tela e que nenhum botão de fallback aparece no `ThankYou` `[R1.1, R3.2]`
      — **não executado**: exige backend rodando (`vendor/`, banco migrado) e
      um provider de WhatsApp real conectado, indisponível neste ambiente.
- [ ] 2.2 Fluxo de falha: forçar falha de envio (ex. telefone inválido, ou
      provider de WhatsApp desconectado/desconfigurado) e confirmar que o botão
      "Baixar PDF" aparece no `ThankYou` e que o clique baixa o arquivo correto `[R3.1, R3.3]`
      — **não executado**, mesmo motivo acima.
- [ ] 2.3 Confirmar que o botão aparece mesmo quando o resultado do polling só
      chega **depois** que o lead já navegou para a tela `ThankYou` (esperar
      responder o formulário de qualificação rápido o suficiente para chegar
      antes dos ~80s de polling) `[R3.6]`
      — **não executado**, mesmo motivo acima.
- [ ] 2.4 Confirmar que uma falha total de geração (`status: 'failed'`, ex.
      forçando erro na renderização do PDF) mantém o `console.error` atual e
      **não** exibe nenhum botão `[R1.3, R3.4]`
      — **não executado**, mesmo motivo acima.
- [x] 2.5 Rodar `npx vite build` e `npx oxlint` na raiz do projeto e confirmar
      que não há erros novos — ambos limpos, sem erros/avisos novos.

---

## Notas

- Nenhuma mudança de banco de dados, rota de API, job ou serviço de backend é
  necessária — confirmado no Requisito 2 e no `design.md`.
- Esta spec assume que o pipeline de WhatsApp da spec [[seo-ia-whatsapp]] já
  está implementado e funcional (está — ver `tasks.md` daquela spec, Fase 3),
  incluindo o campo `whatsapp_sent` retornado por `GET /api/report/{id}`.
