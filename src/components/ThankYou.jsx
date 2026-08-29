import { buildCalendlyLink, isCalendlyConfigured } from '../config/calendly';

export default function ThankYou({ name, email }) {
  const calendlyConfigured = isCalendlyConfigured();
  const calendlyLink = buildCalendlyLink({ name, email });

  return (
    <section
      id="thankyou-section"
      style={{
        display: 'flex',
        background: '#0D0D17',
        minHeight: '100dvh',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '460px', width: '100%' }}>
        <div
          style={{
            width: '72px',
            height: '72px',
            background: 'rgba(160,138,78,.12)',
            border: '1.5px solid rgba(160,138,78,.35)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 28px',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#A08A4E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 style={{ fontSize: 'clamp(24px,5.5vw,34px)', fontWeight: 800, marginBottom: '14px', letterSpacing: '-.3px' }}>
          Quer entender como levar seu escritório para o <span style={{ color: '#A08A4E' }}>próximo nível</span>?
        </h2>
        <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'rgba(255,255,255,.5)', marginBottom: '28px', fontWeight: 300 }}>
          Se o seu diagnóstico mostrou que existem oportunidades de melhoria, você pode solicitar uma análise mais aprofundada do seu cenário com nossa equipe.
        </p>

        {calendlyConfigured ? (
          <a href={calendlyLink} target="_blank" rel="noopener noreferrer" className="cta-btn" style={{ textDecoration: 'none' }}>
            Quero analisar meu escritório
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        ) : (
          <button type="button" className="cta-btn" disabled>
            Agendamento indisponível no momento
          </button>
        )}

        <p style={{ marginTop: '28px', fontSize: '12px', color: 'rgba(255,255,255,.3)' }}>
          {name ? `${name.split(' ')[0]}, seu` : 'Seu'} diagnóstico completo também está a caminho do seu WhatsApp.
        </p>
      </div>
    </section>
  );
}
