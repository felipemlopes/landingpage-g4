import { APP_SHORT_NAME } from '../../config/brand';

export default function Sidebar({ tab, onTabChange, onLogout, user }) {
  const initials = (name) =>
    (name || 'A').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div style={{ fontSize: '19px', fontWeight: 800, letterSpacing: '-.3px', color: '#fff' }}>
          <span style={{ color: '#A08A4E' }}>{APP_SHORT_NAME}</span> Admin
        </div>

        {/* Ações mobile: Perfil + Sair */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="mobile-actions">
          <button
            type="button"
            onClick={() => onTabChange('perfil')}
            title="Perfil"
            style={{
              background: tab === 'perfil' ? 'rgba(160,138,78,.2)' : 'rgba(255,255,255,.06)',
              border: `1px solid ${tab === 'perfil' ? 'rgba(160,138,78,.4)' : 'rgba(255,255,255,.12)'}`,
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: tab === 'perfil' ? '#A08A4E' : 'rgba(255,255,255,.6)',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: "'Sora', sans-serif",
              flexShrink: 0,
            }}
          >
            {initials(user?.name)}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="btn btn-ghost"
            style={{ borderColor: 'rgba(255,255,255,.15)', color: 'rgba(255,255,255,.6)', fontSize: '12px', padding: '6px 12px' }}
          >
            Sair
          </button>
        </div>
      </div>

      {/* Navegação principal */}
      <div className="sidebar-nav-wrap">
        <button type="button" className={`nav-item${tab === 'leads' ? ' active' : ''}`} onClick={() => onTabChange('leads')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Leads
        </button>
        <button type="button" className={`nav-item${tab === 'perguntas' ? ' active' : ''}`} onClick={() => onTabChange('perguntas')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Perguntas
        </button>
        <button type="button" className={`nav-item${tab === 'integracoes' ? ' active' : ''}`} onClick={() => onTabChange('integracoes')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            <path d="M17 3v5h-5" />
            <path d="M21 3l-9 9" />
          </svg>
          Integrações
        </button>
      </div>

      {/* Footer — só aparece no desktop */}
      <div className="sidebar-footer-wrap">
        <button
          type="button"
          className={`sidebar-profile${tab === 'perfil' ? ' active' : ''}`}
          onClick={() => onTabChange('perfil')}
        >
          <div className="sidebar-avatar">{initials(user?.name)}</div>
          <div className="sidebar-profile-info">
            <div className="sidebar-profile-name">{user?.name || 'Admin'}</div>
            <div className="sidebar-profile-email">{user?.email || ''}</div>
          </div>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.4 }}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        <button type="button" className="nav-item" style={{ color: 'rgba(255,255,255,.3)', marginTop: '4px' }} onClick={onLogout}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Sair da conta</span>
        </button>
      </div>
    </aside>
  );
}
