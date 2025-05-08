import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './auth/login';
import Admin from './pages/AdminDashboard';
import Register from './auth/Register';
import NotFound from './pages/NotFound';
import ServicesSettings from './pages/ServicesSettings';
import ShopSettings from './pages/ShopSettings';
import './styles/App.css';

function App() {
  return (
    <Router>
      {/* Envolvendo a aplicação com o BarberShopProvider */}
        <Routes>
          {/* Corrigido para aceitar o parâmetro dinâmico :uid */}
          <Route path="/admin/:uid/*" element={<Admin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/home/:uid" element={<Home />} />
          <Route path="/ServicesSettings/:uid" element={<ServicesSettings />} />
          <Route path="/ShopSettings/:uid" element={<ShopSettings />} />
          <Route path="/" element={<Login />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
    </Router>
  );
}

export default App;
