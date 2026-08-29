import { useEffect, useState } from 'react';
import { questionsApi } from '../services/api';

// Perguntas de qualificação comercial (10 e 11 do briefing) aparecem depois do
// resultado, na tela Qualify — não fazem parte deste quiz inicial.
const QUALIFY_SLUGS = ['intencao_compra', 'fit_investimento'];

function isOtherLabel(label) {
  return (label || '').trim().toLowerCase() === 'outra';
}

export default function Quiz({ onComplete }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [idx, setIdx]             = useState(0);
  const [answers, setAnswers]     = useState([]);
  const [visible, setVisible]     = useState(false);

  // Estado local da pergunta atual (resetado a cada troca de idx)
  const [selected, setSelected]           = useState(null); // escolha_unica
  const [textValue, setTextValue]         = useState('');   // texto_livre
  const [multiSelected, setMultiSelected] = useState([]);   // multipla_com_outra
  const [otherText, setOtherText]         = useState('');   // multipla_com_outra + "Outra"

  useEffect(() => {
    questionsApi.getAll()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setQuestions(list.filter((q) => !QUALIFY_SLUGS.includes(q.category_slug)));
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar perguntas. Tente novamente.');
        setLoading(false);
      });
  }, []);

  const total = questions.length;
  const q     = questions[idx];

  const scoredAnswers = answers.filter((a) => a.points !== null && a.points !== undefined);
  const scorePreview  = scoredAnswers.length
    ? Math.round(scoredAnswers.reduce((sum, a) => sum + a.points, 0) / scoredAnswers.length)
    : 0;
  const progress = total > 0 ? Math.max(11, Math.round((idx / total) * 100)) : 11;

  useEffect(() => {
    if (!q) return;
    setVisible(false);
    setSelected(null);
    setTextValue('');
    setMultiSelected([]);
    setOtherText('');
    const t = setTimeout(() => setVisible(true), 160);
    return () => clearTimeout(t);
  }, [idx, q]);

  function pushAnswerAndAdvance(answer) {
    const newAnswers = [...answers, answer];
    if (idx < total - 1) {
      setAnswers(newAnswers);
      setIdx(idx + 1);
    } else {
      onComplete(newAnswers, questions);
    }
  }

  function selectSingle(optionIndex, option) {
    if (selected !== null) return;
    setSelected(optionIndex);
    setTimeout(() => {
      pushAnswerAndAdvance({
        questionId:   q.id,
        categorySlug: q.category_slug,
        type:         q.type,
        scored:       q.scored,
        value:        option.label,
        points:       q.scored ? Number(option.points) : null,
        otherText:    null,
      });
    }, 380);
  }

  function submitText() {
    const trimmed = textValue.trim();
    if (!trimmed) return;
    pushAnswerAndAdvance({
      questionId:   q.id,
      categorySlug: q.category_slug,
      type:         q.type,
      scored:       false,
      value:        trimmed,
      points:       null,
      otherText:    null,
    });
  }

  function toggleMultiOption(label) {
    setMultiSelected((prev) => (
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    ));
  }

  const otherChecked   = multiSelected.some(isOtherLabel);
  const canSubmitMulti = multiSelected.length > 0 && (!otherChecked || otherText.trim().length > 0);

  function submitMulti() {
    if (!canSubmitMulti) return;
    pushAnswerAndAdvance({
      questionId:   q.id,
      categorySlug: q.category_slug,
      type:         q.type,
      scored:       false,
      value:        multiSelected,
      points:       null,
      otherText:    otherChecked ? otherText.trim() : null,
    });
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <section style={{ display: 'flex', minHeight: '100dvh', background: '#0D0D17', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '36px', height: '36px', border: '3px solid rgba(255,255,255,.1)',
            borderTopColor: '#A08A4E', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
          }} />
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.4)' }}>Carregando perguntas...</p>
        </div>
      </section>
    );
  }

  // ── Erro ──────────────────────────────────────────────────────────────────
  if (error || total === 0) {
    return (
      <section style={{ display: 'flex', minHeight: '100dvh', background: '#0D0D17', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '360px' }}>
          <p style={{ fontSize: '15px', color: '#ef4444', marginBottom: '16px' }}>
            {error || 'Nenhuma pergunta disponível no momento.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ background: '#A08A4E', color: '#0D0D17', border: 'none', borderRadius: '8px', padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}
          >
            Tentar novamente
          </button>
        </div>
      </section>
    );
  }

  // ── Quiz ──────────────────────────────────────────────────────────────────
  return (
    <section id="quiz-section" style={{ display: 'flex', minHeight: '100dvh', background: '#0D0D17', flexDirection: 'column' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#0D0D17', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '14px 24px' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,.35)', whiteSpace: 'nowrap', minWidth: '32px' }}>
            <span style={{ color: '#A08A4E' }}>{idx + 1}</span>/{total}
          </span>
          <div style={{ flex: 1, background: 'rgba(255,255,255,.08)', borderRadius: '100px', height: '3px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg,#A08A4E,#C4A96A)',
                borderRadius: '100px',
                width: progress + '%',
                transition: 'width .5s cubic-bezier(.22,1,.36,1)',
              }}
            />
          </div>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.25)', fontWeight: 500, minWidth: '40px', textAlign: 'right' }}>
            {scorePreview} pts
          </span>
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: '560px', margin: '0 auto', width: '100%', padding: '48px 24px 60px' }}>
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(14px)',
            transition: 'opacity .3s, transform .3s',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#A08A4E', marginBottom: '16px' }}>
            {q.category}
          </div>
          <h2 style={{ fontSize: 'clamp(20px,4vw,28px)', fontWeight: 700, lineHeight: 1.3, marginBottom: '32px', textWrap: 'balance' }}>
            {q.text}
          </h2>

          {q.type === 'texto_livre' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Digite sua resposta..."
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitText(); }}
                autoFocus
              />
              <button type="button" className="cta-btn" disabled={!textValue.trim()} onClick={submitText}>
                Continuar
              </button>
            </div>
          )}

          {q.type === 'escolha_unica' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {q.options.map((opt, i) => {
                const letter    = String.fromCharCode(65 + i);
                const isSelected = selected === i;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    className="opt-btn"
                    onClick={() => selectSingle(i, opt)}
                    style={{
                      background: isSelected ? 'rgba(160,138,78,.15)' : 'rgba(19,25,48,.7)',
                      border: `1.5px solid ${isSelected ? '#A08A4E' : 'rgba(255,255,255,.08)'}`,
                      borderRadius: '10px',
                      padding: '14px 16px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      color: '#fff',
                      fontSize: '14px',
                      fontWeight: 400,
                      lineHeight: 1.45,
                      width: '100%',
                      transition: 'all .15s',
                      fontFamily: "'Sora',sans-serif",
                      animation: `fadeUp .3s ${i * 55}ms cubic-bezier(.22,1,.36,1) both`,
                    }}
                  >
                    <span
                      className="opt-letter"
                      style={{
                        minWidth: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        border: `1.5px solid ${isSelected ? '#A08A4E' : 'rgba(255,255,255,.15)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: isSelected ? '#0D0D17' : 'rgba(255,255,255,.4)',
                        background: isSelected ? '#A08A4E' : 'transparent',
                        flexShrink: 0,
                        transition: 'all .15s',
                      }}
                    >
                      {letter}
                    </span>
                    <span style={{ paddingTop: '2px' }}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {q.type === 'multipla_com_outra' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {q.options.map((opt, i) => {
                const isChecked = multiSelected.includes(opt.label);
                return (
                  <div key={opt.label}>
                    <button
                      type="button"
                      className="opt-btn"
                      onClick={() => toggleMultiOption(opt.label)}
                      style={{
                        background: isChecked ? 'rgba(160,138,78,.15)' : 'rgba(19,25,48,.7)',
                        border: `1.5px solid ${isChecked ? '#A08A4E' : 'rgba(255,255,255,.08)'}`,
                        borderRadius: '10px',
                        padding: '14px 16px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 400,
                        lineHeight: 1.45,
                        width: '100%',
                        transition: 'all .15s',
                        fontFamily: "'Sora',sans-serif",
                        animation: `fadeUp .3s ${i * 55}ms cubic-bezier(.22,1,.36,1) both`,
                      }}
                    >
                      <span
                        className="opt-letter"
                        style={{
                          minWidth: '22px',
                          height: '22px',
                          borderRadius: '6px',
                          border: `1.5px solid ${isChecked ? '#A08A4E' : 'rgba(255,255,255,.15)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isChecked ? '#A08A4E' : 'transparent',
                          flexShrink: 0,
                          marginTop: '2px',
                          transition: 'all .15s',
                        }}
                      >
                        {isChecked && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0D0D17" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                      <span style={{ paddingTop: '2px' }}>{opt.label}</span>
                    </button>
                    {isOtherLabel(opt.label) && isChecked && (
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Conte com suas palavras..."
                        value={otherText}
                        onChange={(e) => setOtherText(e.target.value)}
                        style={{ marginTop: '8px' }}
                        autoFocus
                      />
                    )}
                  </div>
                );
              })}
              <button type="button" className="cta-btn" disabled={!canSubmitMulti} onClick={submitMulti} style={{ marginTop: '6px' }}>
                Continuar
              </button>
              {!canSubmitMulti && (
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,.3)', textAlign: 'center' }}>
                  {otherChecked ? 'Digite sua resposta para continuar.' : 'Marque pelo menos uma opção para continuar.'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </section>
  );
}
