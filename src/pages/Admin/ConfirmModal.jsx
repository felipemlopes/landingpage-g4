export default function ConfirmModal({
  title = 'Tem certeza?',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = true,
  onConfirm,
  onClose,
}) {
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="modal-bg open" onClick={handleBackdropClick}>
      <div className="modal-box" style={{ maxWidth: '380px', textAlign: 'center' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            margin: '0 auto 16px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: danger ? 'rgba(248,113,113,.1)' : 'rgba(160,138,78,.12)',
            color: danger ? 'var(--red)' : 'var(--gold)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h2 style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-.2px', marginBottom: '8px' }}>{title}</h2>
        {message && (
          <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5, marginBottom: '24px' }}>{message}</p>
        )}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button type="button" onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={danger ? 'btn btn-danger' : 'btn btn-primary'}
            style={{ flex: 1, padding: danger ? '8px 16px' : '12px 16px' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
