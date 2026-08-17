import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './admin.css';
import Login from './Login';
import Sidebar from './Sidebar';
import LeadsPanel from './LeadsPanel';
import QuestionsPanel from './QuestionsPanel';
import ProfilePanel from './ProfilePanel';
import IntegracoesPanel from './IntegracoesPanel';
import { auth } from '../../services/api';

export default function AdminPanel() {
  const [authed, setAuthed]   = useState(false);
  const [checking, setChecking] = useState(true);
  const [user, setUser]       = useState(null);
  const { tab }               = useParams();
  const navigate              = useNavigate();

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      setChecking(false);
      return;
    }
    auth.me()
      .then((u) => { setUser(u); setAuthed(true); })
      .catch(() => { auth.logout(); setAuthed(false); })
      .finally(() => setChecking(false));
  }, []);

  function handleLogin() {
    auth.me().then((u) => setUser(u)).catch(() => {});
    setAuthed(true);
  }

  function handleLogout() {
    auth.logout();
    setAuthed(false);
    setUser(null);
  }

  function handleTabChange(newTab) {
    navigate(`/admin/${newTab}`);
  }

  if (checking) {
    return (
      <div className="admin-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid rgba(160,138,78,.2)', borderTopColor: '#A08A4E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="admin-root">
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  function renderPanel() {
    if (tab === 'perguntas')    return <QuestionsPanel />;
    if (tab === 'integracoes')  return <IntegracoesPanel />;
    if (tab === 'perfil')       return <ProfilePanel user={user} onUpdate={setUser} />;
    return <LeadsPanel />;
  }

  return (
    <div className="admin-root">
      <div className="layout">
        <Sidebar tab={tab} onTabChange={handleTabChange} onLogout={handleLogout} user={user} />
        <main className="main-content">
          {renderPanel()}
        </main>
      </div>
    </div>
  );
}
