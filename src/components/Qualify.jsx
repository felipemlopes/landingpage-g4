import { useEffect, useState } from 'react';
import { questionsApi } from '../services/api';

// As duas perguntas de qualificação comercial (10 e 11 do briefing), feitas
// depois do resultado do diagnóstico — não alteram o score de maturidade.
const QUALIFY_SLUGS = ['intencao_compra', 'fit_investimento'];

export default function Qualify({ onComplete }) {
  const [questions, setQuestions]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [idx, setIdx]                 = useState(0);
  const [selected, setSelected]       = useState(null);
  const [visible, setVisible]         = useState(false);
  // Guarda a resposta da 1ª pergunta até a 2ª ser respondida.
  const [firstAnswer, setFirstAnswer] = useState(null);

  useEffect(() => {
    questionsApi.getAll()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const ordered = QUALIFY_SLUGS
          .map((slug) => list.find((q) => q.category_slug === slug))
          .filter(Boolean);
        setQuestions(ordered);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const total = questions.length;
  const q     = questions[idx];

  useEffect(() => {
    if (!q) return;
    setVisible(false);
    setSelected(null);
    const t = setTimeout(() => setVisible(true), 160);
    return () => clearTimeout(t);
  }, [idx, q]);

  function selectOption(i, option) {
    if (selected !== null) return;
    setSelected(i);
    setTimeout(() => {
      const answer = { categorySlug: q.category_slug, value: option.label };
      if (idx < total - 1) {
        setIdx(idx + 1);
        setFirstAnswer(answer);
      } else {
        finish(answer);
      }
    }, 380);
  }

  function finish(secondAnswer) {
    const answers = firstAnswer ? [firstAnswer, secondAnswer] : [secondAnswer];
    const payload = {};
    answers.forEach((a) => { payload[a.categorySlug] = a.value; });
    onComplete(payload);
  }

  // Se não houver as duas perguntas configuradas, não bloqueia o funil.
  useEffect(() => {
    if (!loading && total === 0) onComplete({});
  }, [loading, total, onComplete]);

  if (loading || !q) {
    return (
      <section style={{ display: 'flex', minHeight: '100dvh', background: '#0D0D17', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid rgba(255,255,255,.1)', borderTopColor: '#A08A4E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </section>
    );
  }

  return (
    <section id="qualify-section" style={{ display: 'flex', minHeight: '100dvh', background: '#0D0D17', flexDirection: 'column' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#0D0D17', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '14px 24px' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#A08A4E' }}>
            Agora queremos entender o seu momento
          </span>
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: '560px', margin: '0 auto', width: '100%', padding: '48px 24px 60px' }}>
        <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(14px)', transition: 'opacity .3s, transform .3s' }}>
          <h2 style={{ fontSize: 'clamp(20px,4vw,28px)', fontWeight: 700, lineHeight: 1.3, marginBottom: '32px', textWrap: 'balance' }}>
            {q.text}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {q.options.map((opt, i) => {
              const letter    = String.fromCharCode(65 + i);
              const isSelected = selected === i;
              return (
                <button
                  key={opt.label}
                  type="button"
                  className="opt-btn"
                  onClick={() => selectOption(i, opt)}
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
                      minWidth: '26px', height: '26px', borderRadius: '50%',
                      border: `1.5px solid ${isSelected ? '#A08A4E' : 'rgba(255,255,255,.15)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 700,
                      color: isSelected ? '#0D0D17' : 'rgba(255,255,255,.4)',
                      background: isSelected ? '#A08A4E' : 'transparent',
                      flexShrink: 0, transition: 'all .15s',
                    }}
                  >
                    {letter}
                  </span>
                  <span style={{ paddingTop: '2px' }}>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
