import { useEffect, useState } from 'react';
import { axes, barColor, getOpportunity, getScoreData } from '../data/quizData';

const CIRCUMFERENCE = 289;

export default function ResultForm({ score, answers, onSubmit }) {
  const [displayScore, setDisplayScore] = useState(0);
  const [axesAnimated, setAxesAnimated] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const sd = getScoreData(score);
  const opportunity = getOpportunity(score);

  const axesData = axes.map((axis) => {
    const pts = axis.qs.map((i) => answers[i] ?? 50);
    const avg = Math.round(pts.reduce((a, b) => a + b, 0) / pts.length);
    return { ...axis, avg, color: barColor(avg) };
  });

  useEffect(() => {
    let raf;
    const t0 = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - t0) / 1100, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplayScore(Math.round(e * score));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const startTimer = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, 200);
    const axesTimer = setTimeout(() => setAxesAnimated(true), 80);
    return () => {
      clearTimeout(startTimer);
      clearTimeout(axesTimer);
      cancelAnimationFrame(raf);
    };
  }, [score]);

  function handlePhoneChange(e) {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 6) v = '(' + v.slice(0, 2) + ') ' + v.slice(2, 7) + '-' + v.slice(7);
    else if (v.length > 2) v = '(' + v.slice(0, 2) + ') ' + v.slice(2);
    else if (v.length) v = '(' + v;
    setPhone(v);
  }

  function handleSubmit() {
    if (!name.trim()) {
      setError('Informe seu nome.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      setError('WhatsApp inválido.');
      return;
    }
    setError('');
    onSubmit({ name: name.trim(), phone: phone.trim(), email: email.trim() });
  }

  return (
    <section id="form-section" style={{ display: 'block', background: '#0D0D17', minHeight: '100dvh', padding: '48px 24px 60px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ position: 'relative', width: '110px', height: '110px', margin: '0 auto 20px' }}>
            <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="7" />
              <circle
                cx="55"
                cy="55"
                r="46"
                fill="none"
                stroke="#A08A4E"
                strokeWidth="7"
                strokeLinecap="round"
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
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>{sd.label}</h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.5)', lineHeight: 1.65, maxWidth: '380px', margin: '0 auto' }}>{sd.desc}</p>
        </div>

        <div style={{ background: '#131930', border: '1px solid rgba(160,138,78,.2)', borderRadius: '10px', padding: '18px 20px', marginBottom: '20px' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#A08A4E', marginBottom: '8px' }}>
            Sua oportunidade de crescimento
          </div>
          <p style={{ fontSize: '13px', lineHeight: 1.65, color: 'rgba(255,255,255,.75)' }}>{opportunity}</p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: '14px' }}>
            Seus pontos por eixo
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {axesData.map((axis, ai) => (
              <div key={axis.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.7)' }}>{axis.label}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: axis.color }}>{axis.avg}%</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,.07)', borderRadius: '100px', height: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: axesAnimated ? axis.avg + '%' : '0%',
                      background: axis.color,
                      borderRadius: '100px',
                      transition: `width .9s ${ai * 120}ms cubic-bezier(.22,1,.36,1)`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#131930', border: '1px solid rgba(255,255,255,.07)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>Receba seu plano no WhatsApp</h3>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.4)', marginBottom: '20px', lineHeight: 1.5 }}>
            Enviamos seu diagnóstico e plano de aceleração personalizado.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input value={name} onChange={(e) => setName(e.target.value)} type="text" placeholder="Seu nome" className="input-field" />
            <input value={phone} onChange={handlePhoneChange} type="tel" placeholder="WhatsApp com DDD" className="input-field" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Seu melhor e-mail" className="input-field" />
            {error && <div style={{ fontSize: '13px', color: '#ef4444', paddingTop: '4px' }}>{error}</div>}
            <button type="button" onClick={handleSubmit} className="cta-btn" style={{ marginTop: '6px' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Quero meu plano
            </button>
          </div>
          <p style={{ marginTop: '12px', fontSize: '11px', color: 'rgba(255,255,255,.2)', textAlign: 'center' }}>
            Seus dados são protegidos. Sem spam.
          </p>
        </div>
      </div>
    </section>
  );
}
