import { useEffect, useRef, useState } from 'react';

export default function QuestionModal({ question, onSave, onClose }) {
  const isNew = question === null;
  const [category, setCategory] = useState(question?.category ?? '');
  const [text, setText] = useState(question?.text ?? '');
  const [answers, setAnswers] = useState(question?.options ?? []);
  const categoryRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => categoryRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

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
    if (answers.length < 2) {
      alert('Adicione ao menos 2 respostas.');
      return;
    }
    const options = answers.map((a) => ({
      label: a.label.trim() || 'Sem texto',
      points: parseInt(a.points, 10) || 0,
    }));
    onSave({ category: cat, text: txt, options });
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
                  <span style={{ fontSize: '11px', color: 'rgba(13,13,23,.35)', flexShrink: 0 }}>pts</span>
                  <input
                    type="number"
                    className="field-xs answer-pts"
                    min={0}
                    max={100}
                    style={{ width: '60px' }}
                    value={a.points}
                    onChange={(e) => updateAnswer(i, 'points', e.target.value)}
                  />
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
