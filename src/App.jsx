import { Route, BrowserRouter, Routes } from 'react-router-dom';
import Landing from './pages/Landing';
import AdminPanel from './pages/Admin/AdminPanel';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
