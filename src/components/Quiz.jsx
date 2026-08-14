import { useEffect, useState } from 'react';
import { questionsApi } from '../services/api';

export default function Quiz({ onComplete }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [idx, setIdx]             = useState(0);
  const [answers, setAnswers]     = useState([]);
  const [visible, setVisible]     = useState(false);
  const [selected, setSelected]   = useState(null);

  // Busca perguntas da API ao montar
  useEffect(() => {
    questionsApi.getAll()
      .then((data) => {
        setQuestions(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar perguntas. Tente novamente.');
        setLoading(false);
      });
  }, []);

  const total = questions.length;
  const q     = questions[idx];

  const scorePreview = answers.length
    ? Math.round(answers.reduce((a, b) => a + b, 0) / answers.length)
    : 0;
  const progress = total > 0 ? Math.max(11, Math.round((idx / total) * 100)) : 11;

  useEffect(() => {
    if (!q) return;
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 160);
    return () => clearTimeout(t);
  }, [idx, q]);

  function selectOption(i, points) {
    if (selected !== null) return;
    setSelected(i);
    setTimeout(() => {
      const newAnswers = [...answers, Number(points)];
      if (idx < total - 1) {
        setAnswers(newAnswers);
        setIdx(idx + 1);
        setSelected(null);
      } else {
        onComplete(newAnswers, questions);
      }
    }, 380);
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {q.options.map((opt, i) => {
              const letter    = String.fromCharCode(65 + i);
              const isSelected = selected === i;
              return (
                <button
                  key={opt.label}
                  type="button"
                  className="opt-btn"
                  onClick={() => selectOption(i, opt.points)}
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
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </section>
  );
}
