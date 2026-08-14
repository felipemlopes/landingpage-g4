import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing';
import AdminPanel from './pages/Admin/AdminPanel';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        {/* Redireciona /admin para /admin/leads */}
        <Route path="/admin" element={<Navigate to="/admin/leads" replace />} />

        {/* Painel admin com sub-rotas */}
        <Route path="/admin/:tab" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
