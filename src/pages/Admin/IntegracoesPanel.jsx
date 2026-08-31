import { useEffect, useRef, useState } from 'react';
import { aiSettingsApi, calendlySettingsApi, whatsappApi } from '../../services/api';

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 30; // ~2 minutos

const emptyForm = {
  provider: 'evolution',
  cloud_token: '',
  cloud_phone_number_id: '',
  cloud_waba_id: '',
};

export default function IntegracoesPanel() {
  const [loading, setLoading]       = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus]         = useState(null); // { provider, connected, detail }
  const [qrCode, setQrCode]         = useState(null);
  const [error, setError]           = useState('');

  const [showConnectModal, setShowConnectModal] = useState(false);

  const [settings, setSettings]         = useState(null); // últimos dados salvos (vindos da API)
  const [form, setForm]                 = useState(emptyForm);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved]   = useState(false);
  const [settingsError, setSettingsError]   = useState('');

  const [calendlyUrl, setCalendlyUrl]       = useState(''); // último valor salvo
  const [calendlyForm, setCalendlyForm]     = useState('');
  const [savingCalendly, setSavingCalendly] = useState(false);
  const [calendlySaved, setCalendlySaved]   = useState(false);
  const [calendlyError, setCalendlyError]   = useState('');

  const [aiSettings, setAiSettings] = useState(null); // { openai_api_key_set, openai_api_key_masked }
  const [aiKeyForm, setAiKeyForm]   = useState('');
  const [savingAi, setSavingAi]     = useState(false);
  const [aiSaved, setAiSaved]       = useState(false);
  const [aiError, setAiError]       = useState('');

  const pollRef      = useRef(null);
  const pollCountRef = useRef(0);

  useEffect(() => {
    loadAll();
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [statusData, settingsData, calendlyData, aiData] = await Promise.all([
        whatsappApi.status(),
        whatsappApi.getSettings(),
        calendlySettingsApi.get(),
        aiSettingsApi.getSettings(),
      ]);
      setStatus(statusData);
      applySettings(settingsData);
      setCalendlyUrl(calendlyData.url || '');
      setCalendlyForm(calendlyData.url || '');
      setAiSettings(aiData);
    } catch (err) {
      setError(err.message || 'Erro ao consultar as integrações.');
    } finally {
      setLoading(false);
    }
  }

  function applySettings(data) {
    setSettings(data);
    setForm({
      provider: data.provider,
      cloud_token: '',
      cloud_phone_number_id: data.cloud_phone_number_id || '',
      cloud_waba_id: data.cloud_waba_id || '',
    });
  }

  async function loadStatus() {
    setError('');
    try {
      const data = await whatsappApi.status();
      setStatus(data);
    } catch (err) {
      setError(err.message || 'Erro ao consultar status do WhatsApp.');
    }
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling() {
    stopPolling();
    pollCountRef.current = 0;
    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      try {
        const data = await whatsappApi.status();
        setStatus(data);
        if (data.connected || pollCountRef.current >= MAX_POLLS) {
          stopPolling();
          if (data.connected) setQrCode(null);
        }
      } catch {
        // silencioso — tenta de novo no próximo tick
      }
    }, POLL_INTERVAL_MS);
  }

  async function handleConnect() {
    setShowConnectModal(true); // abre o modal já em estado de "criando instância..."
    setConnecting(true);
    setError('');
    try {
      const data = await whatsappApi.connect();
      setStatus(data);
      if (data.qrCode) {
        setQrCode(data.qrCode);
        startPolling();
      } else {
        setQrCode(null);
      }
    } catch (err) {
      setError(err.message || 'Erro ao conectar.');
    } finally {
      setConnecting(false);
    }
  }

  function closeConnectModal() {
    setShowConnectModal(false);
    stopPolling();
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSettingsSaved(false);
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsError('');
    setSettingsSaved(false);
    try {
      const data = await whatsappApi.saveSettings(form);
      applySettings(data);
      setSettingsSaved(true);
      stopPolling();
      setQrCode(null);
      await loadStatus();
    } catch (err) {
      setSettingsError(err.message || 'Erro ao salvar configuração.');
    } finally {
      setSavingSettings(false);
    }
  }

  function updateCalendlyField(value) {
    setCalendlyForm(value);
    setCalendlySaved(false);
  }

  async function handleSaveCalendly(e) {
    e.preventDefault();
    setSavingCalendly(true);
    setCalendlyError('');
    setCalendlySaved(false);
    try {
      const data = await calendlySettingsApi.save(calendlyForm);
      setCalendlyUrl(data.url || '');
      setCalendlyForm(data.url || '');
      setCalendlySaved(true);
    } catch (err) {
      setCalendlyError(err.message || 'Erro ao salvar o link do Calendly.');
    } finally {
      setSavingCalendly(false);
    }
  }

  function updateAiKeyField(value) {
    setAiKeyForm(value);
    setAiSaved(false);
  }

  async function handleSaveAiKey(e) {
    e.preventDefault();
    if (!aiKeyForm) return; // vazio não altera nada (Requisito 1.3) — nem chama a API
    setSavingAi(true);
    setAiError('');
    setAiSaved(false);
    try {
      const data = await aiSettingsApi.saveSettings(aiKeyForm);
      setAiSettings(data);
      setAiKeyForm(''); // a key nunca é re-exibida em texto puro
      setAiSaved(true);
    } catch (err) {
      setAiError(err.message || 'Erro ao salvar a API key.');
    } finally {
      setSavingAi(false);
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid rgba(160,138,78,.2)', borderTopColor: '#A08A4E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const isEvolution   = form.provider !== 'official';
  const connectLabel  = isEvolution ? 'Conectar' : 'Testar conexão';
  const providerLabel = status?.provider === 'official' ? 'API Oficial (Meta)' : 'Evolution API';
  const dirty = !!settings && (
    form.provider !== settings.provider ||
    form.cloud_phone_number_id !== (settings.cloud_phone_number_id || '') ||
    form.cloud_waba_id !== (settings.cloud_waba_id || '') ||
    !!form.cloud_token
  );
  const calendlyDirty = calendlyForm !== calendlyUrl;

  return (
    <div style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: 'clamp(18px,3.5vw,24px)', fontWeight: 700, letterSpacing: '-.3px' }}>Integrações</h1>
          <p style={{ fontSize: '13px', color: 'rgba(13,13,23,.35)', marginTop: '5px' }}>
            Conexão com o WhatsApp usada para enviar o diagnóstico automaticamente.
          </p>
        </div>
      </div>

      {/* ── Configuração do provider ─────────────────────────────────────── */}
      <form onSubmit={handleSaveSettings} style={{ background: '#fff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#A08A4E' }}>
          Provider
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {[
            { value: 'evolution', label: 'Evolution API' },
            { value: 'official', label: 'API Oficial (Meta)' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateField('provider', opt.value)}
              className={form.provider === opt.value ? 'btn btn-primary' : 'btn btn-ghost'}
              style={{ flex: 1, fontSize: '13px', padding: '10px 14px' }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {isEvolution ? (
          <p style={{ fontSize: '12px', color: 'rgba(13,13,23,.45)', lineHeight: 1.6, margin: 0 }}>
            A URL, a API Key e a instância da Evolution são geridas pela aplicação — nada a configurar aqui.
            Clique em "Conectar" abaixo para criar a instância (se ainda não existir) e gerar o QR Code.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: 'rgba(160,138,78,.8)', marginBottom: '8px' }}>
                Access Token
              </label>
              <input
                type="password"
                className="field"
                placeholder={settings?.cloud_token_set ? settings.cloud_token_masked : 'Token permanente da Meta'}
                value={form.cloud_token}
                onChange={(e) => updateField('cloud_token', e.target.value)}
                autoComplete="off"
              />
              {settings?.cloud_token_set && (
                <span style={{ fontSize: '11px', color: 'rgba(13,13,23,.35)', marginTop: '5px', display: 'block' }}>
                  Já configurado. Deixe em branco para manter o token atual.
                </span>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: 'rgba(160,138,78,.8)', marginBottom: '8px' }}>
                Phone Number ID
              </label>
              <input
                type="text"
                className="field"
                placeholder="Ex: 123456789012345"
                value={form.cloud_phone_number_id}
                onChange={(e) => updateField('cloud_phone_number_id', e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: 'rgba(160,138,78,.8)', marginBottom: '8px' }}>
                WhatsApp Business Account ID (opcional)
              </label>
              <input
                type="text"
                className="field"
                placeholder="Ex: 987654321098765"
                value={form.cloud_waba_id}
                onChange={(e) => updateField('cloud_waba_id', e.target.value)}
              />
            </div>
          </div>
        )}

        {settingsError && (
          <div style={{ background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.2)', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#dc2626' }}>
            {settingsError}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="submit"
            disabled={savingSettings}
            className="btn btn-accent"
            style={{ fontSize: '13px', padding: '9px 18px', opacity: savingSettings ? 0.7 : 1 }}
          >
            {savingSettings ? 'Salvando...' : 'Salvar configuração'}
          </button>
          {settingsSaved && (
            <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>Configuração salva.</span>
          )}
          {dirty && !settingsSaved && (
            <span style={{ fontSize: '12px', color: 'rgba(13,13,23,.4)' }}>Alterações não salvas.</span>
          )}
        </div>
      </form>

      {/* ── Status / conexão ─────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#A08A4E' }}>
          Provider ativo: {providerLabel}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: status?.connected ? '#16a34a' : '#dc2626',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: '14px', fontWeight: 600 }}>
            {status?.connected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>

        {status?.detail && (
          <p style={{ fontSize: '13px', color: 'rgba(13,13,23,.5)', lineHeight: 1.6 }}>{status.detail}</p>
        )}

        {error && (
          <div style={{ background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.2)', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#dc2626' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleConnect}
            disabled={connecting || dirty}
            title={dirty ? 'Salve a configuração antes de conectar' : ''}
            className="btn btn-primary"
            style={{ fontSize: '14px', padding: '10px 22px', opacity: connecting || dirty ? 0.6 : 1 }}
          >
            {connecting ? 'Conectando...' : connectLabel}
          </button>
          <button type="button" onClick={loadStatus} className="btn btn-ghost" style={{ fontSize: '14px', padding: '10px 22px' }}>
            Atualizar status
          </button>
        </div>
      </div>

      {/* ── Calendly ──────────────────────────────────────────────────────── */}
      <form onSubmit={handleSaveCalendly} style={{ background: '#fff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#A08A4E' }}>
            Calendly
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(13,13,23,.45)', lineHeight: 1.6, marginTop: '6px' }}>
            Link de agendamento usado no CTA final do diagnóstico ("Quero analisar
            meu escritório"). Deixe em branco para desabilitar o botão.
          </p>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: 'rgba(160,138,78,.8)', marginBottom: '8px' }}>
            Link de agendamento
          </label>
          <input
            type="url"
            className="field"
            placeholder="https://calendly.com/sua-empresa/evento"
            value={calendlyForm}
            onChange={(e) => updateCalendlyField(e.target.value)}
          />
        </div>

        {calendlyError && (
          <div style={{ background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.2)', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#dc2626' }}>
            {calendlyError}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="submit"
            disabled={savingCalendly}
            className="btn btn-accent"
            style={{ fontSize: '13px', padding: '9px 18px', opacity: savingCalendly ? 0.7 : 1 }}
          >
            {savingCalendly ? 'Salvando...' : 'Salvar link'}
          </button>
          {calendlySaved && (
            <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>Configuração salva.</span>
          )}
          {calendlyDirty && !calendlySaved && (
            <span style={{ fontSize: '12px', color: 'rgba(13,13,23,.4)' }}>Alterações não salvas.</span>
          )}
        </div>
      </form>

      {/* ── IA (OpenAI) ───────────────────────────────────────────────────── */}
      <form onSubmit={handleSaveAiKey} style={{ background: '#fff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#A08A4E' }}>
            IA (OpenAI)
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(13,13,23,.45)', lineHeight: 1.6, marginTop: '6px' }}>
            API key usada para gerar o relatório de diagnóstico. O modelo e o
            provider de IA continuam configurados no servidor.
          </p>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: 'rgba(160,138,78,.8)', marginBottom: '8px' }}>
            API Key
          </label>
          <input
            type="password"
            className="field"
            placeholder={aiSettings?.openai_api_key_set ? aiSettings.openai_api_key_masked : 'sk-...'}
            value={aiKeyForm}
            onChange={(e) => updateAiKeyField(e.target.value)}
            autoComplete="off"
          />
          {aiSettings?.openai_api_key_set && (
            <span style={{ fontSize: '11px', color: 'rgba(13,13,23,.35)', marginTop: '5px', display: 'block' }}>
              Já configurada. Deixe em branco para manter a key atual.
            </span>
          )}
        </div>

        {aiError && (
          <div style={{ background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.2)', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#dc2626' }}>
            {aiError}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="submit"
            disabled={savingAi || !aiKeyForm}
            title={!aiKeyForm ? 'Cole uma key nova para salvar' : ''}
            className="btn btn-accent"
            style={{ fontSize: '13px', padding: '9px 18px', opacity: savingAi || !aiKeyForm ? 0.7 : 1 }}
          >
            {savingAi ? 'Salvando...' : 'Salvar key'}
          </button>
          {aiSaved && (
            <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>Configuração salva.</span>
          )}
        </div>
      </form>

      {/* ── Modal: criar instância / escanear QR Code ────────────────────── */}
      {showConnectModal && (
        <div
          onClick={closeConnectModal}
          style={{ position: 'fixed', inset: 0, background: 'rgba(13,13,23,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '14px', padding: '28px', maxWidth: '360px', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#A08A4E' }}>
                Conectar WhatsApp
              </span>
              <button
                type="button"
                onClick={closeConnectModal}
                aria-label="Fechar"
                className="btn btn-ghost"
                style={{ padding: '4px 10px', fontSize: '14px', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {connecting && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '24px 0' }}>
                <div style={{ width: '28px', height: '28px', border: '3px solid rgba(160,138,78,.2)', borderTopColor: '#A08A4E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: '13px', color: 'rgba(13,13,23,.5)' }}>
                  {isEvolution ? 'Criando instância...' : 'Testando conexão...'}
                </span>
              </div>
            )}

            {!connecting && status?.connected && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '20px 0' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(22,163,74,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', fontSize: '20px' }}>✓</div>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>WhatsApp conectado.</span>
              </div>
            )}

            {!connecting && !status?.connected && qrCode && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <img
                  src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="QR Code para conectar o WhatsApp"
                  style={{ width: '220px', height: '220px' }}
                />
                <span style={{ fontSize: '12px', color: 'rgba(13,13,23,.4)', textAlign: 'center' }}>
                  Escaneie com o WhatsApp do número que vai enviar os diagnósticos.
                  Aguardando leitura...
                </span>
              </div>
            )}

            {!connecting && !status?.connected && !qrCode && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '13px', color: 'rgba(13,13,23,.55)', lineHeight: 1.6, margin: 0 }}>
                  {status?.detail || 'Não foi possível gerar o QR Code.'}
                </p>
                <button type="button" onClick={handleConnect} className="btn btn-primary" style={{ fontSize: '13px', padding: '9px 18px' }}>
                  Tentar novamente
                </button>
              </div>
            )}

            {error && (
              <div style={{ background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.2)', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#dc2626' }}>
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
