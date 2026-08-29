import { useEffect, useState } from 'react';

const CIRCUMFERENCE = 289;

/**
 * Renderiza o diagnóstico calculado pelo backend (`DiagnosisEngine`), recebido
 * em `POST /api/leads` como `diagnosis`. Não recalcula nada no navegador —
 * fonte única de verdade fica no servidor (requirements.md — Requisito 2.7).
 */
export default function DiagnosisResult({ name, diagnosis, onContinue }) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let raf;
    const t0 = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - t0) / 1100, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplayScore(Math.round(e * diagnosis.score));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const t = setTimeout(() => { raf = requestAnimationFrame(tick); }, 200);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [diagnosis.score]);

  const firstName = (name || '').split(' ')[0];

  return (
    <section id="diagnosis-result-section" style={{ display: 'block', background: '#0D0D17', minHeight: '100dvh', padding: '48px 24px 60px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        {/* Score circular + nível */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ position: 'relative', width: '110px', height: '110px', margin: '0 auto 20px' }}>
            <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="7" />
              <circle cx="55" cy="55" r="46" fill="none" stroke="#A08A4E" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE - CIRCUMFERENCE * (displayScore / 100)}
                style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '30px', fontWeight: 800, color: '#A08A4E', lineHeight: 1 }}>{displayScore}</span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,.35)', fontWeight: 500 }}>de 100</span>
            </div>
          </div>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#A08A4E', marginBottom: '8px' }}>
            {firstName ? `${firstName}, seu nível atual é` : 'Seu nível atual é'}
          </p>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>{diagnosis.level_title}</h2>
        </div>

        {/* Próximo estágio */}
        <div style={{ background: '#131930', border: '1px solid rgba(160,138,78,.2)', borderRadius: '10px', padding: '18px 20px', marginBottom: '16px' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#A08A4E', marginBottom: '8px' }}>
            Seu próximo estágio
          </div>
          <p style={{ fontSize: '13px', lineHeight: 1.65, color: 'rgba(255,255,255,.75)' }}>{diagnosis.next_stage}</p>
        </div>

        {/* Principal gargalo */}
        {diagnosis.bottleneck_label && diagnosis.bottleneck_label !== '—' && (
          <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', borderRadius: '10px', padding: '18px 20px', marginBottom: '16px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#ef4444', marginBottom: '8px' }}>
              Principal gargalo
            </div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{diagnosis.bottleneck_label}</p>
          </div>
        )}

        {/* Pontos fortes / pontos de atenção */}
        {(diagnosis.strengths.length > 0 || diagnosis.attention_points.length > 0) && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {diagnosis.strengths.length > 0 && (
              <div style={{ flex: '1 1 180px', background: '#131930', border: '1px solid rgba(34,197,94,.2)', borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#22c55e', marginBottom: '10px' }}>
                  Pontos fortes
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {diagnosis.strengths.map((s) => (
                    <span key={s} style={{ fontSize: '13px', color: 'rgba(255,255,255,.75)' }}>• {s}</span>
                  ))}
                </div>
              </div>
            )}
            {diagnosis.attention_points.length > 0 && (
              <div style={{ flex: '1 1 180px', background: '#131930', border: '1px solid rgba(245,158,11,.2)', borderRadius: '10px', padding: '16px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#f59e0b', marginBottom: '10px' }}>
                  Pontos de atenção
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {diagnosis.attention_points.map((s) => (
                    <span key={s} style={{ fontSize: '13px', color: 'rgba(255,255,255,.75)' }}>• {s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prioridades recomendadas */}
        {diagnosis.priorities.length > 0 && (
          <div style={{ background: '#131930', border: '1px solid rgba(255,255,255,.07)', borderRadius: '10px', padding: '18px 20px', marginBottom: '28px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#A08A4E', marginBottom: '12px' }}>
              Prioridades recomendadas
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {diagnosis.priorities.map((p, i) => (
                <div key={p} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{
                    minWidth: '20px', height: '20px', background: '#A08A4E', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: 700, color: '#0D0D17', flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.75)', lineHeight: 1.5 }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button type="button" onClick={onContinue} className="cta-btn">
          Continuar
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </section>
  );
}
