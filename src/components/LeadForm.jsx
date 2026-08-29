import { useState } from 'react';

/**
 * Captura nome/WhatsApp/e-mail logo após o quiz, ANTES de exibir o resultado
 * (decisão de escopo confirmada: o diagnóstico continua exigindo contato antes
 * de aparecer, ver requirements.md — Contexto). O resultado em si é renderizado
 * por `DiagnosisResult`, depois que `onSubmit` resolve.
 */
export default function LeadForm({ onSubmit }) {
  const [name, setName]   = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handlePhoneChange(e) {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 6)      v = '(' + v.slice(0, 2) + ') ' + v.slice(2, 7) + '-' + v.slice(7);
    else if (v.length > 2) v = '(' + v.slice(0, 2) + ') ' + v.slice(2);
    else if (v.length)     v = '(' + v;
    setPhone(v);
  }

  async function handleSubmit() {
    if (!name.trim()) { setError('Informe seu nome.'); return; }
    if (phone.replace(/\D/g, '').length < 10) { setError('WhatsApp inválido.'); return; }
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), phone: phone.trim(), email: email.trim() });
    } catch {
      setError('Não foi possível enviar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="lead-form-section" style={{ display: 'flex', alignItems: 'center', background: '#0D0D17', minHeight: '100dvh', padding: '48px 24px 60px' }}>
      <div style={{ maxWidth: '440px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '56px', height: '56px', background: 'rgba(160,138,78,.12)',
              border: '1.5px solid rgba(160,138,78,.35)', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A08A4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
            </svg>
          </div>
          <h2 style={{ fontSize: 'clamp(22px,5vw,28px)', fontWeight: 800, marginBottom: '10px', letterSpacing: '-.3px' }}>
            Seu diagnóstico está pronto
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.5)', lineHeight: 1.6 }}>
            Informe seus dados para ver o nível de maturidade do seu escritório, seu principal gargalo e as prioridades recomendadas.
          </p>
        </div>

        <div style={{ background: '#131930', border: '1px solid rgba(255,255,255,.07)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input value={name}  onChange={(e) => setName(e.target.value)}  type="text"  placeholder="Seu nome"         className="input-field" autoFocus />
            <input value={phone} onChange={handlePhoneChange}               type="tel"   placeholder="WhatsApp com DDD" className="input-field" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Seu melhor e-mail" className="input-field" />
            {error && <div style={{ fontSize: '13px', color: '#ef4444', paddingTop: '4px' }}>{error}</div>}
            <button type="button" onClick={handleSubmit} disabled={submitting} className="cta-btn" style={{ marginTop: '6px', opacity: submitting ? 0.7 : 1 }}>
              {submitting ? 'Calculando...' : 'Ver meu diagnóstico'}
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
