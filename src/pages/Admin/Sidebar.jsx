export default function Sidebar({ tab, onTabChange, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div style={{ fontSize: '19px', fontWeight: 800, letterSpacing: '-.3px', color: '#fff' }}>
          <span style={{ color: '#A08A4E' }}>G4</span> Admin
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="btn btn-ghost mobile-logout"
          style={{ borderColor: 'rgba(255,255,255,.15)', color: 'rgba(255,255,255,.6)', fontSize: '12px', padding: '6px 12px' }}
        >
          Sair
        </button>
      </div>
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
        <button type="button" className={`nav-item${tab === 'questions' ? ' active' : ''}`} onClick={() => onTabChange('questions')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Perguntas
        </button>
      </div>
      <div className="sidebar-footer-wrap">
        <button type="button" className="nav-item" style={{ color: 'rgba(255,255,255,.25)' }} onClick={onLogout}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sair da conta
        </button>
      </div>
    </aside>
  );
}
