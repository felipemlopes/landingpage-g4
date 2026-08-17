import { useEffect, useMemo, useState } from 'react';
import { leadsApi } from '../../services/api';
import { initials, scoreColor, scoreLabel } from './adminUtils';

const WHATSAPP_BADGE = {
  sent:     { label: 'Enviado',     bg: 'rgba(22,163,74,.1)',   color: '#16a34a' },
  failed:   { label: 'Falhou',      bg: 'rgba(220,38,38,.1)',   color: '#dc2626' },
  disabled: { label: 'Desabilitado', bg: 'rgba(107,114,128,.1)', color: '#6b7280' },
  pending:  { label: 'Pendente',    bg: 'rgba(217,119,6,.1)',   color: '#d97706' },
};

function whatsappBadge(status) {
  return WHATSAPP_BADGE[status] || WHATSAPP_BADGE.pending;
}

export default function LeadsPanel() {
  const [leads, setLeads]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [resendingId, setResendingId] = useState(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    setLoading(true);
    setError('');
    try {
      const data = await leadsApi.getAll();
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.message === 'UNAUTHORIZED') {
        window.location.reload();
        return;
      }
      setError('Erro ao carregar leads. Verifique se a API está rodando.');
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const avg   = leads.length ? Math.round(leads.reduce((a, b) => a + (b.score || 0), 0) / leads.length) : 0;
    const today = leads.filter((l) => l.created_at && new Date(l.created_at).toDateString() === new Date().toDateString()).length;
    const high  = leads.filter((l) => (l.score || 0) >= 65).length;
    return [
      { label: 'Total',          value: leads.length, cls: 'gold',   color: '#A08A4E',  icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></> },
      { label: 'Score médio',    value: avg,          cls: 'green',  color: scoreColor(avg), icon: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/> },
      { label: 'Captados hoje',  value: today,        cls: 'purple', color: '#a78bfa',  icon: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></> },
      { label: 'Alta maturidade',value: high,         cls: 'yellow', color: '#fbbf24',  icon: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/> },
    ];
  }, [leads]);

  async function deleteLead(id) {
    if (!confirm('Remover este lead?')) return;
    try {
      await leadsApi.delete(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch {
      alert('Erro ao remover lead.');
    }
  }

  async function clearAll() {
    if (!confirm('Apagar todos os leads? Ação irreversível.')) return;
    try {
      await leadsApi.deleteAll();
      setLeads([]);
    } catch {
      alert('Erro ao limpar leads.');
    }
  }

  async function exportXlsx() {
    try {
      await leadsApi.exportXlsx();
    } catch {
      alert('Erro ao exportar XLSX.');
    }
  }

  async function resendReport(id) {
    setResendingId(id);
    try {
      const res = await leadsApi.resendReport(id);
      setLeads((prev) => prev.map((l) => (
        l.id === id ? { ...l, whatsapp_status: res.whatsapp_status, whatsapp_error: res.whatsapp_error } : l
      )));
      if (res.whatsapp_status !== 'sent') {
        alert(res.whatsapp_error || 'Não foi possível reenviar o diagnóstico.');
      }
    } catch (err) {
      alert(err.message || 'Erro ao reenviar diagnóstico.');
    } finally {
      setResendingId(null);
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid rgba(160,138,78,.2)', borderTopColor: '#A08A4E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: 'clamp(18px,3.5vw,24px)', fontWeight: 700, letterSpacing: '-.3px' }}>Leads capturados</h1>
          <p style={{ fontSize: '13px', color: 'rgba(13,13,23,.35)', marginTop: '5px' }}>
            {leads.length} {leads.length !== 1 ? 'leads capturados' : 'lead capturado'}
          </p>
        </div>
        <div className="page-actions">
          <button type="button" onClick={exportXlsx} className="btn btn-accent">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Exportar XLSX
          </button>
          <button type="button" onClick={clearAll} className="btn btn-danger">Limpar tudo</button>
        </div>
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

      <div className="stats-grid">
        {stats.map((c) => (
          <div key={c.label} className={`stat-card ${c.cls}`}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{c.icon}</svg>
              </div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: c.color, lineHeight: 1, letterSpacing: '-.5px' }}>{c.value}</div>
            <div style={{ fontSize: '12px', color: 'rgba(13,13,23,.4)', marginTop: '5px' }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div className="table-wrap">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Lead</th><th>WhatsApp</th><th>E-mail</th>
                <th style={{ textAlign: 'center' }}>Score</th><th>Data</th>
                <th style={{ textAlign: 'center' }}>PDF</th>
                <th style={{ textAlign: 'center' }}>Envio WhatsApp</th>
                <th style={{ width: '36px' }}></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const d    = l.created_at ? new Date(l.created_at) : null;
                const ds   = d ? d.toLocaleDateString('pt-BR') + ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
                const sc   = l.score || 0;
                const col  = scoreColor(sc);
                const wa   = whatsappBadge(l.whatsapp_status);
                const resending = resendingId === l.id;
                return (
                  <tr key={l.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', background: 'rgba(160,138,78,.15)', border: '1px solid rgba(160,138,78,.25)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#A08A4E', flexShrink: 0 }}>
                          {initials(l.name)}
                        </div>
                        <span style={{ fontWeight: 500 }}>{l.name || '—'}</span>
                      </div>
                    </td>
                    <td style={{ color: 'rgba(13,13,23,.5)' }}>{l.phone || '—'}</td>
                    <td style={{ color: 'rgba(13,13,23,.5)' }}>{l.email || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge" style={{ background: col + '14', border: `1px solid ${col}33`, color: col }}>{sc} pts</span>
                    </td>
                    <td style={{ color: 'rgba(13,13,23,.35)', fontSize: '12px' }}>{ds}</td>
                    <td style={{ textAlign: 'center', fontSize: '12px', color: l.report_generated_at ? '#16a34a' : 'rgba(13,13,23,.3)' }}>
                      {l.report_generated_at ? 'Gerado' : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <span className="badge" style={{ background: wa.bg, border: `1px solid ${wa.color}33`, color: wa.color }} title={l.whatsapp_error || ''}>
                          {wa.label}
                        </span>
                        {l.whatsapp_status === 'failed' && (
                          <button
                            type="button"
                            onClick={() => resendReport(l.id)}
                            disabled={resending}
                            title="Reenviar diagnóstico pelo WhatsApp"
                            className="btn btn-ghost"
                            style={{ fontSize: '11px', padding: '4px 10px', opacity: resending ? 0.6 : 1 }}
                          >
                            {resending ? '...' : 'Reenviar'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <button type="button" className="btn-icon del" title="Remover" onClick={() => deleteLead(l.id)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {leads.length === 0 && (
            <div style={{ padding: '56px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: 'rgba(13,13,23,.25)' }}>Nenhum lead ainda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
