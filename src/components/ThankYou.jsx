export default function ThankYou({ name }) {
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
        <h2 style={{ fontSize: 'clamp(26px,6vw,38px)', fontWeight: 800, marginBottom: '12px', letterSpacing: '-.3px' }}>
          Pronto, <span style={{ color: '#A08A4E' }}>{name}</span>!
        </h2>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,.5)', marginBottom: '36px', fontWeight: 300 }}>
          Seu diagnóstico e plano de crescimento estão a caminho do seu WhatsApp. Nossa equipe vai te chamar para destravar os pontos que mais pesam no seu funil.
        </p>
        <div style={{ background: '#131930', border: '1px solid rgba(255,255,255,.07)', borderRadius: '10px', padding: '22px', textAlign: 'left' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#A08A4E', marginBottom: '14px' }}>
            O que acontece agora
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              'Você recebe seu diagnóstico completo no WhatsApp em instantes',
              'Nossa equipe entra em contato com seu plano personalizado',
              'Você decide como acelerar seu crescimento comercial',
            ].map((text, i) => (
              <div key={text} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div
                  style={{
                    minWidth: '22px',
                    height: '22px',
                    background: '#A08A4E',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#0D0D17',
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.65)', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
