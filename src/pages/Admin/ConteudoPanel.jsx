import { useEffect, useState } from 'react';
import { homeContentApi } from '../../services/api';

const FIELD_DEFS = [
  { key: 'badge_text', label: 'Selo (acima do headline)', type: 'text', maxLength: 120 },
  { key: 'headline_line1', label: 'Headline — início', type: 'text', maxLength: 120 },
  { key: 'headline_highlight', label: 'Headline — trecho destacado (dourado)', type: 'text', maxLength: 120 },
  { key: 'headline_line3', label: 'Headline — final', type: 'text', maxLength: 120 },
  { key: 'subheadline', label: 'Subheadline', type: 'textarea', maxLength: 300 },
  { key: 'stat1_value', label: 'Stat 1 — valor', type: 'text', maxLength: 20, group: 'stats' },
  { key: 'stat1_label', label: 'Stat 1 — rótulo', type: 'text', maxLength: 40, group: 'stats' },
  { key: 'stat2_value', label: 'Stat 2 — valor', type: 'text', maxLength: 20, group: 'stats' },
  { key: 'stat2_label', label: 'Stat 2 — rótulo', type: 'text', maxLength: 40, group: 'stats' },
  { key: 'stat3_value', label: 'Stat 3 — valor', type: 'text', maxLength: 20, group: 'stats' },
  { key: 'stat3_label', label: 'Stat 3 — rótulo', type: 'text', maxLength: 40, group: 'stats' },
  { key: 'cta_button_text', label: 'Texto do botão principal', type: 'text', maxLength: 60 },
  { key: 'cta_subtext', label: 'Legenda abaixo do botão', type: 'text', maxLength: 120 },
];

function labelStyle() {
  return { display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: 'rgba(160,138,78,.8)', marginBottom: '8px' };
}

export default function ConteudoPanel() {
  const [loading, setLoading]   = useState(true);
  const [content, setContent]   = useState(null); // último valor salvo (vindo da API)
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await homeContentApi.get();
      setContent(data);
      setForm(data);
    } catch (err) {
      setError(err.message || 'Erro ao carregar os textos da Home.');
    } finally {
      setLoading(false);
    }
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const data = await homeContentApi.save(form);
      setContent(data);
      setForm(data);
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Erro ao salvar os textos.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRestoreAll() {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const emptyPayload = Object.fromEntries(FIELD_DEFS.map((f) => [f.key, '']));
      const data = await homeContentApi.save(emptyPayload);
      setContent(data);
      setForm(data);
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Erro ao restaurar os padrões.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid rgba(160,138,78,.2)', borderTopColor: '#A08A4E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const dirty = !!content && FIELD_DEFS.some((f) => (form[f.key] || '') !== (content[f.key] || ''));
  const statFields = FIELD_DEFS.filter((f) => f.group === 'stats');
  const otherFields = FIELD_DEFS.filter((f) => f.group !== 'stats');

  return (
    <div style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: 'clamp(18px,3.5vw,24px)', fontWeight: 700, letterSpacing: '-.3px' }}>Conteúdo</h1>
          <p style={{ fontSize: '13px', color: 'rgba(13,13,23,.35)', marginTop: '5px' }}>
            Textos exibidos na Home (selo, headline, subheadline, stats e CTA). Deixe um campo em branco para voltar ao padrão daquele campo.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <form onSubmit={handleSave} style={{ flex: '1 1 420px', background: '#fff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {otherFields.map((f) => (
            <div key={f.key}>
              <label style={labelStyle()}>{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea
                  className="field"
                  rows={3}
                  maxLength={f.maxLength}
                  value={form[f.key] || ''}
                  onChange={(e) => updateField(f.key, e.target.value)}
                  placeholder={content?.[f.key]}
                  style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, width: '100%' }}
                />
              ) : (
                <input
                  type="text"
                  className="field"
                  maxLength={f.maxLength}
                  value={form[f.key] || ''}
                  onChange={(e) => updateField(f.key, e.target.value)}
                  placeholder={content?.[f.key]}
                />
              )}
            </div>
          ))}

          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#A08A4E', marginBottom: '10px' }}>
              Stats (3 caixinhas)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[statFields[i * 2], statFields[i * 2 + 1]].map((f) => (
                    <div key={f.key}>
                      <label style={{ ...labelStyle(), marginBottom: '4px' }}>{f.key.endsWith('value') ? 'Valor' : 'Rótulo'}</label>
                      <input
                        type="text"
                        className="field"
                        maxLength={f.maxLength}
                        value={form[f.key] || ''}
                        onChange={(e) => updateField(f.key, e.target.value)}
                        placeholder={content?.[f.key]}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.2)', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-accent"
              style={{ fontSize: '13px', padding: '9px 18px', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Salvando...' : 'Salvar textos'}
            </button>
            <button
              type="button"
              onClick={handleRestoreAll}
              disabled={saving}
              className="btn btn-ghost"
              style={{ fontSize: '13px', padding: '9px 18px' }}
            >
              Restaurar todos os padrões
            </button>
            {saved && (
              <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>Textos salvos.</span>
            )}
            {dirty && !saved && (
              <span style={{ fontSize: '12px', color: 'rgba(13,13,23,.4)' }}>Alterações não salvas.</span>
            )}
          </div>
        </form>

        {/* ── Preview reduzido do Hero ──────────────────────────────────── */}
        <div style={{ flex: '1 1 320px', position: 'sticky', top: '24px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: 'rgba(13,13,23,.4)', marginBottom: '10px' }}>
            Preview
          </div>
          <div style={{ background: 'linear-gradient(160deg,#0D0D17 60%,#131930 100%)', borderRadius: '14px', padding: '32px 24px', textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(160,138,78,.1)',
                border: '1px solid rgba(160,138,78,.25)',
                borderRadius: '100px',
                padding: '5px 12px',
                marginBottom: '18px',
              }}
            >
              <span style={{ fontSize: '10px', fontWeight: 600, color: '#A08A4E', letterSpacing: '1px', textTransform: 'uppercase' }}>
                {form.badge_text || content?.badge_text}
              </span>
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.2, color: '#fff', marginBottom: '12px' }}>
              {form.headline_line1 || content?.headline_line1}
              <br />
              <span style={{ color: '#A08A4E' }}>{form.headline_highlight || content?.headline_highlight}</span>
              <br />
              {form.headline_line3 || content?.headline_line3}
            </h2>

            <p style={{ fontSize: '12px', lineHeight: 1.6, color: 'rgba(255,255,255,.55)', marginBottom: '20px' }}>
              {form.subheadline || content?.subheadline}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', border: '1px solid rgba(255,255,255,.08)', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px' }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ flex: 1, padding: '10px 6px', borderRight: i < 2 ? '1px solid rgba(255,255,255,.08)' : 'none' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#A08A4E' }}>
                    {form[`stat${i + 1}_value`] || content?.[`stat${i + 1}_value`]}
                  </div>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.4px' }}>
                    {form[`stat${i + 1}_label`] || content?.[`stat${i + 1}_label`]}
                  </div>
                </div>
              ))}
            </div>

            <div className="cta-btn" style={{ display: 'inline-flex', fontSize: '13px', padding: '10px 20px' }}>
              {form.cta_button_text || content?.cta_button_text}
            </div>
            <p style={{ marginTop: '10px', fontSize: '10px', color: 'rgba(255,255,255,.25)' }}>
              {form.cta_subtext || content?.cta_subtext}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
