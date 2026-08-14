import { useEffect, useRef, useState } from 'react';
import { auth } from '../../services/api';

export default function Login({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const emailRef                = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => emailRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  async function attempt() {
    if (!email.trim() || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await auth.login(email.trim(), password);
      onLogin();
    } catch (e) {
      setError(e.message || 'E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') attempt();
  }

  const errorBorder = error ? { borderColor: '#f87171' } : undefined;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', position: 'relative', overflow: 'hidden' }}>
      <div
        className="admin-login-left"
        style={{
          display: 'flex', flex: 1,
          background: 'linear-gradient(135deg,#1D1C3A 0%,#131930 100%)',
          padding: '60px', flexDirection: 'column', justifyContent: 'space-between',
          borderRight: '1px solid rgba(160,138,78,.15)',
          position: 'relative', overflow: 'hidden', color: '#fff',
        }}
      >
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '400px', height: '400px', background: 'radial-gradient(ellipse,rgba(160,138,78,.12) 0%,transparent 65%)', pointerEvents: 'none' }} />
        <div>
          <div style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-.5px' }}>
            <span style={{ color: '#A08A4E' }}>G4</span> Admin
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(160,138,78,.7)', marginBottom: '20px' }}>
            O que você gerencia aqui
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { icon: <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>, title: 'Gestão de leads', desc: 'Visualize, exporte e gerencie contatos' },
              { icon: <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>, title: 'Diagnóstico interativo', desc: 'Edite perguntas e pontuações' },
            ].map((item) => (
              <div key={item.title} style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <div style={{ width: '36px', height: '36px', background: 'rgba(160,138,78,.1)', border: '1px solid rgba(160,138,78,.25)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A08A4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{item.title}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.4)', marginTop: '2px' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.2)' }}>G4 Business · Diagnóstico Comercial</div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', background: '#131930', color: '#fff' }}>
        <div style={{ maxWidth: '360px', width: '100%' }}>
          <div className="fu" style={{ marginBottom: '36px' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-.5px', marginBottom: '6px' }}>
              <span style={{ color: '#A08A4E' }}>G4</span> Admin
            </div>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.4)' }}>Acesse o painel de gestão</p>
          </div>
          <div className="fu fu-1" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '.6px', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginBottom: '8px' }}>E-mail</label>
              <input ref={emailRef} type="email" placeholder="admin@admin.com" className="field" value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                onKeyDown={handleKeyDown} style={errorBorder} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '.6px', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginBottom: '8px' }}>Senha</label>
              <input type="password" placeholder="••••••••" className="field" value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onKeyDown={handleKeyDown} style={errorBorder} />
            </div>
            {error && (
              <div style={{ background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.2)', borderRadius: '7px', padding: '10px 14px', fontSize: '13px', color: '#dc2626' }}>
                {error}
              </div>
            )}
            <button type="button" onClick={attempt} disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '4px', fontSize: '15px', padding: '14px', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
