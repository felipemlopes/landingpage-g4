import { useMemo, useState } from 'react';
import { getLeads, initials, saveLeads, scoreColor, scoreLabel } from './adminUtils';

export default function LeadsPanel() {
  const [leads, setLeads] = useState(() => getLeads());

  const stats = useMemo(() => {
    const avg = leads.length ? Math.round(leads.reduce((a, b) => a + (b.score || 0), 0) / leads.length) : 0;
    const today = leads.filter((l) => l.date && new Date(l.date).toDateString() === new Date().toDateString()).length;
    const high = leads.filter((l) => (l.score || 0) >= 65).length;
    return [
      {
        label: 'Total',
        value: leads.length,
        cls: 'gold',
        color: '#A08A4E',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        label: 'Score médio',
        value: avg,
        cls: 'green',
        color: scoreColor(avg),
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        ),
      },
      {
        label: 'Captados hoje',
        value: today,
        cls: 'purple',
        color: '#a78bfa',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        ),
      },
      {
        label: 'Alta maturidade',
        value: high,
        cls: 'yellow',
        color: '#fbbf24',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ),
      },
    ];
  }, [leads]);

  function deleteLead(index) {
    if (!confirm('Remover este lead?')) return;
    const next = [...leads];
    next.splice(index, 1);
    setLeads(next);
    saveLeads(next);
  }

  function clearAll() {
    if (!confirm('Apagar todos os leads? Ação irreversível.')) return;
    setLeads([]);
    localStorage.removeItem('g4_leads');
  }

  function exportCsv() {
    const rows = [['Nome', 'WhatsApp', 'Email', 'Score', 'Nível', 'Data']];
    leads.forEach((l) => {
      const d = l.date ? new Date(l.date).toLocaleString('pt-BR') : '';
      rows.push([l.name || '', l.phone || '', l.email || '', l.score || 0, scoreLabel(l.score || 0), d]);
    });
    const csv = rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads-g4-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

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
          <button type="button" onClick={exportCsv} className="btn btn-accent">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar CSV
          </button>
          <button type="button" onClick={clearAll} className="btn btn-danger">
            Limpar tudo
          </button>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((c) => (
          <div key={c.label} className={`stat-card ${c.cls}`}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color }}>
                {c.icon}
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
                <th>Lead</th>
                <th>WhatsApp</th>
                <th>E-mail</th>
                <th style={{ textAlign: 'center' }}>Score</th>
                <th>Data</th>
                <th style={{ width: '36px' }}></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l, i) => {
                const d = l.date ? new Date(l.date) : null;
                const ds = d ? d.toLocaleDateString('pt-BR') + ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
                const sc = l.score || 0;
                const col = scoreColor(sc);
                return (
                  <tr key={l.id ?? i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            background: 'rgba(160,138,78,.15)',
                            border: '1px solid rgba(160,138,78,.25)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#A08A4E',
                            flexShrink: 0,
                          }}
                        >
                          {initials(l.name)}
                        </div>
                        <span style={{ fontWeight: 500 }}>{l.name || '—'}</span>
                      </div>
                    </td>
                    <td style={{ color: 'rgba(13,13,23,.5)' }}>{l.phone || '—'}</td>
                    <td style={{ color: 'rgba(13,13,23,.5)' }}>{l.email || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge" style={{ background: col + '14', border: `1px solid ${col}33`, color: col }}>
                        {sc} pts
                      </span>
                    </td>
                    <td style={{ color: 'rgba(13,13,23,.35)', fontSize: '12px' }}>{ds}</td>
                    <td>
                      <button type="button" className="btn-icon del" title="Remover" onClick={() => deleteLead(i)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M9 6V4h6v2" />
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
              <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,.04)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(13,13,23,.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                </svg>
              </div>
              <p style={{ fontSize: '14px', color: 'rgba(13,13,23,.25)' }}>Nenhum lead ainda.</p>
              <p style={{ fontSize: '13px', color: 'rgba(13,13,23,.15)', marginTop: '4px' }}>Complete o diagnóstico para ver leads aqui.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
