import { useEffect, useRef, useState } from 'react';

// Espelha App\Services\DiagnosisEngine::AXES (backend) — os 5 eixos que compõem
// o score de maturidade. Perguntas com esses category_slug têm tipo/"pontua"
// travados na UI para não quebrar silenciosamente o cálculo do diagnóstico
// (ver requirements.md — Requisito 4.2). O texto e as opções continuam livres.
const FIXED_AXIS_SLUGS = [
  'geracao_demanda',
  'estrutura_comercial',
  'controle_custo',
  'atendimento_conversao',
  'previsibilidade',
];

const TYPE_LABELS = {
  texto_livre: 'Texto livre',
  escolha_unica: 'Escolha única',
  multipla_com_outra: 'Múltipla escolha (+ "Outra")',
};

export default function QuestionModal({ question, onSave, onClose }) {
  const isNew = question === null;
  const isFixedAxis = Boolean(question?.category_slug) && FIXED_AXIS_SLUGS.includes(question.category_slug);

  const [category, setCategory] = useState(question?.category ?? '');
  const [text, setText] = useState(question?.text ?? '');
  const [type, setType] = useState(question?.type ?? 'escolha_unica');
  const [scored, setScored] = useState(question?.scored ?? true);
  const [allowOther, setAllowOther] = useState(question?.allow_other ?? false);
  const [answers, setAnswers] = useState(question?.options ?? []);
  const categoryRef = useRef(null);

  const hasOptions = type === 'escolha_unica' || type === 'multipla_com_outra';

  useEffect(() => {
    const t = setTimeout(() => categoryRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // texto_livre nunca pontua — mantém o estado consistente se o admin trocar o tipo.
  useEffect(() => {
    if (type === 'texto_livre') setScored(false);
  }, [type]);

  function addAnswer() {
    setAnswers((prev) => [...prev, { label: '', points: 0 }]);
  }

  function updateAnswer(i, field, value) {
    setAnswers((prev) => prev.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)));
  }

  function removeAnswer(i) {
    setAnswers((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSave() {
    const cat = category.trim();
    const txt = text.trim();
    if (!cat || !txt) {
      alert('Preencha a categoria e o texto.');
      return;
    }
    if (hasOptions && answers.length < 2) {
      alert('Adicione ao menos 2 respostas.');
      return;
    }

    const options = hasOptions
      ? answers.map((a) => ({
          label: a.label.trim() || 'Sem texto',
          points: scored ? (parseInt(a.points, 10) || 0) : null,
        }))
      : [];

    onSave({
      category: cat,
      text: txt,
      type,
      scored,
      allow_other: type === 'multipla_com_outra' ? allowOther : false,
      options,
    });
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="modal-bg open" onClick={handleBackdropClick}>
      <div className="modal-box">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-.2px' }}>{isNew ? 'Nova pergunta' : 'Editar pergunta'}</h2>
          <button type="button" className="btn-icon del" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {isFixedAxis && (
            <div style={{ background: 'rgba(160,138,78,.1)', border: '1px solid rgba(160,138,78,.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: 'rgba(13,13,23,.6)', lineHeight: 1.5 }}>
              Esta pergunta compõe o cálculo do diagnóstico (eixo <strong>{question.category_slug}</strong>). O tipo e a pontuação ficam travados para não quebrar o resultado — texto e opções continuam livres para editar.
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: 'rgba(160,138,78,.8)', marginBottom: '8px' }}>
              Categoria
            </label>
            <input ref={categoryRef} type="text" placeholder="Ex: Geração de Demanda" className="field" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: 'rgba(160,138,78,.8)', marginBottom: '8px' }}>
              Pergunta
            </label>
            <input type="text" placeholder="Digite a pergunta..." className="field" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: 'rgba(160,138,78,.8)', marginBottom: '8px' }}>
                Tipo
              </label>
              <select
                className="field"
                value={type}
                disabled={isFixedAxis}
                onChange={(e) => setType(e.target.value)}
                style={isFixedAxis ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
              >
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            {hasOptions && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0D0D17', marginTop: '26px', opacity: isFixedAxis ? 0.6 : 1, cursor: isFixedAxis ? 'not-allowed' : 'pointer' }}>
                <input type="checkbox" checked={scored} disabled={isFixedAxis} onChange={(e) => setScored(e.target.checked)} />
                Conta para o score de maturidade
              </label>
            )}
          </div>
          {type === 'multipla_com_outra' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0D0D17' }}>
              <input type="checkbox" checked={allowOther} onChange={(e) => setAllowOther(e.target.checked)} />
              Tem uma opção "Outra" com texto livre (adicione uma resposta com o texto exato "Outra" abaixo)
            </label>
          )}
          {hasOptions && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: 'rgba(160,138,78,.8)' }}>Respostas</label>
                <button type="button" onClick={addAnswer} className="btn btn-accent" style={{ fontSize: '11px', padding: '5px 10px' }}>
                  + Resposta
                </button>
              </div>
              <div>
                {answers.map((a, i) => (
                  <div key={i} className="ans-row">
                    <span style={{ fontSize: '11px', color: 'rgba(160,138,78,.8)', fontWeight: 700, minWidth: '16px', flexShrink: 0 }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <input
                      type="text"
                      className="field-xs"
                      placeholder="Texto da resposta"
                      value={a.label}
                      onChange={(e) => updateAnswer(i, 'label', e.target.value)}
                    />
                    {scored && (
                      <>
                        <span style={{ fontSize: '11px', color: 'rgba(13,13,23,.35)', flexShrink: 0 }}>pts</span>
                        <input
                          type="number"
                          className="field-xs answer-pts"
                          min={0}
                          max={100}
                          style={{ width: '60px' }}
                          value={a.points ?? 0}
                          onChange={(e) => updateAnswer(i, 'points', e.target.value)}
                        />
                      </>
                    )}
                    <button type="button" className="btn-icon del" onClick={() => removeAnswer(i)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '14px' }}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
