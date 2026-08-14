import { useEffect, useState } from 'react';
import { auth } from '../../services/api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

async function updateProfile(data) {
  const token = localStorage.getItem('g4_admin_token');
  const res = await fetch(`${BASE_URL}/admin/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || `Erro ${res.status}`);
  }
  return res.json();
}

export default function ProfilePanel() {
  const [name, setName]               = useState('');
  const [email, setEmail]             = useState('');
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNewPass]     = useState('');
  const [confirmPassword, setConfirm] = useState('');
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [success, setSuccess]         = useState('');
  const [error, setError]             = useState('');

  useEffect(() => {
    auth.me().then((user) => {
      setName(user.name || '');
      setEmail(user.email || '');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword && newPassword !== confirmPassword) {
      setError('A nova senha e a confirmação não coincidem.');
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    const payload = { name: name.trim(), email: email.trim() };
    if (newPassword) {
      payload.current_password = currentPassword;
      payload.password         = newPassword;
      payload.password_confirmation = confirmPassword;
    }

    setSaving(true);
    try {
      await updateProfile(payload);
      setSuccess('Perfil atualizado com sucesso.');
      setCurrent('');
      setNewPass('');
      setConfirm('');
    } catch (err) {
      setError(err.message || 'Erro ao atualizar perfil.');
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

  return (
    <div style={{ maxWidth: '520px' }}>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: 'clamp(18px,3.5vw,24px)', fontWeight: 700, letterSpacing: '-.3px' }}>Meu perfil</h1>
          <p style={{ fontSize: '13px', color: 'rgba(13,13,23,.35)', marginTop: '5px' }}>Atualize suas informações de acesso.</p>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Dados pessoais */}
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#A08A4E', marginBottom: '4px' }}>
            Dados da conta
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(13,13,23,.4)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: '7px' }}>Nome</label>
            <input type="text" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(13,13,23,.4)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: '7px' }}>E-mail</label>
            <input type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
          </div>
        </div>

        {/* Alterar senha */}
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#A08A4E', marginBottom: '4px' }}>
            Alterar senha <span style={{ fontSize: '10px', color: 'rgba(13,13,23,.3)', textTransform: 'none', letterSpacing: 0 }}>(deixe em branco para não alterar)</span>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(13,13,23,.4)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: '7px' }}>Senha atual</label>
            <input type="password" className="field" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} placeholder="••••••••" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(13,13,23,.4)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: '7px' }}>Nova senha</label>
            <input type="password" className="field" value={newPassword} onChange={(e) => setNewPass(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(13,13,23,.4)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: '7px' }}>Confirmar nova senha</label>
            <input type="password" className="field" value={confirmPassword} onChange={(e) => setConfirm(e.target.value)} placeholder="Repita a nova senha" />
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.2)', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#dc2626' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: 'rgba(22,163,74,.06)', border: '1px solid rgba(22,163,74,.2)', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#16a34a' }}>
            {success}
          </div>
        )}

        <button type="submit" disabled={saving} className="btn btn-primary" style={{ alignSelf: 'flex-start', fontSize: '14px', padding: '12px 28px', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>
    </div>
  );
}
