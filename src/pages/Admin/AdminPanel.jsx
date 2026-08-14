import { useState } from 'react';
import './admin.css';
import Login from './Login';
import Sidebar from './Sidebar';
import LeadsPanel from './LeadsPanel';
import QuestionsPanel from './QuestionsPanel';

export default function AdminPanel() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('g4_admin_auth') === '1');
  const [tab, setTab] = useState('leads');

  function handleLogin() {
    sessionStorage.setItem('g4_admin_auth', '1');
    setAuthed(true);
  }

  function handleLogout() {
    sessionStorage.removeItem('g4_admin_auth');
    setAuthed(false);
  }

  if (!authed) {
    return (
      <div className="admin-root">
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="admin-root">
      <div className="layout">
        <Sidebar tab={tab} onTabChange={setTab} onLogout={handleLogout} />
        <main className="main-content">
          {tab === 'leads' ? <LeadsPanel /> : <QuestionsPanel />}
        </main>
      </div>
    </div>
  );
}
