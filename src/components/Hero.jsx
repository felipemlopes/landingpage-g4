import { APP_SHORT_NAME, APP_NAME } from '../config/brand';

export default function Hero({ onStart }) {
  return (
    <section
      id="hero"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(160deg,#0D0D17 60%,#131930 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(160,138,78,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(160,138,78,.05) 1px,transparent 1px)',
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '-180px',
          right: '-100px',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(ellipse,rgba(160,138,78,.14) 0%,transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      <nav
        style={{
          position: 'relative',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 800, fontSize: '20px', color: '#A08A4E', lineHeight: 1 }}>
            {APP_SHORT_NAME}
          </span>
          <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,.15)' }} />
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,.5)', letterSpacing: '.3px' }}>
            {APP_NAME}
          </span>
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px 64px' }}>
        <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
          <div
            className="fu"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(160,138,78,.1)',
              border: '1px solid rgba(160,138,78,.25)',
              borderRadius: '100px',
              padding: '6px 14px',
              marginBottom: '28px',
            }}
          >
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#A08A4E',
                animation: 'pulse 2s infinite',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#A08A4E', letterSpacing: '1.2px', textTransform: 'uppercase' }}>
              Diagnóstico gratuito · 2 min
            </span>
          </div>

          <h1
            className="fu fu-1"
            style={{
              fontSize: 'clamp(32px,8vw,60px)',
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: '-.5px',
              marginBottom: '20px',
              textWrap: 'balance',
            }}
          >
            Diagnóstico gratuito de como estruturar
            <br />
            <span style={{ color: '#A08A4E' }}>marketing, comercial e vendas</span>
            <br />
            do seu escritório
          </h1>

          <p
            className="fu fu-2"
            style={{
              fontSize: 'clamp(15px,3vw,18px)',
              lineHeight: 1.7,
              color: 'rgba(255,255,255,.55)',
              maxWidth: '480px',
              margin: '0 auto 40px',
              fontWeight: 300,
            }}
          >
            Descubra em 2 minutos onde está o gargalo que trava o crescimento de seu escritório — e receba um plano personalizado no WhatsApp para parar de depender de indicação.
          </p>

          <div
            className="fu fu-3"
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 0,
              marginBottom: '40px',
              border: '1px solid rgba(255,255,255,.08)',
              borderRadius: '12px',
              overflow: 'hidden',
              maxWidth: '380px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            {[
              { value: '9', label: 'Perguntas' },
              { value: '2min', label: 'Para concluir' },
              { value: '100%', label: 'Gratuito' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                style={{
                  flex: 1,
                  padding: '16px 8px',
                  textAlign: 'center',
                  borderRight: i < 2 ? '1px solid rgba(255,255,255,.08)' : 'none',
                }}
              >
                <div style={{ fontSize: '22px', fontWeight: 800, color: '#A08A4E', lineHeight: 1 }}>{stat.value}</div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'rgba(255,255,255,.35)',
                    fontWeight: 500,
                    marginTop: '2px',
                    textTransform: 'uppercase',
                    letterSpacing: '.5px',
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div className="fu fu-4">
            <button onClick={onStart} className="cta-btn" style={{ maxWidth: '340px', margin: '0 auto', fontSize: '17px' }}>
              Começar diagnóstico
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
            <p style={{ marginTop: '14px', fontSize: '12px', color: 'rgba(255,255,255,.25)' }}>
              Sem compromisso · Resultado imediato
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
