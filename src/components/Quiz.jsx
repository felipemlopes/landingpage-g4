import { useEffect, useState } from 'react';
import { questions } from '../data/quizData';

export default function Quiz({ onComplete }) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState(null);

  const q = questions[idx];
  const scorePreview = answers.length
    ? Math.round(answers.reduce((a, b) => a + b, 0) / answers.length)
    : 0;
  const progress = Math.max(11, Math.round((idx / 9) * 100));

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 160);
    return () => clearTimeout(t);
  }, [idx]);

  function selectOption(i, points) {
    if (selected !== null) return;
    setSelected(i);
    setTimeout(() => {
      const newAnswers = [...answers, points];
      if (idx < 8) {
        setAnswers(newAnswers);
        setIdx(idx + 1);
        setSelected(null);
      } else {
        onComplete(newAnswers);
      }
    }, 380);
  }

  return (
    <section id="quiz-section" style={{ display: 'flex', minHeight: '100dvh', background: '#0D0D17', flexDirection: 'column' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#0D0D17', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '14px 24px' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,.35)', whiteSpace: 'nowrap', minWidth: '32px' }}>
            <span style={{ color: '#A08A4E' }}>{idx + 1}</span>/9
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
              const letter = String.fromCharCode(65 + i);
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
    </section>
  );
}
