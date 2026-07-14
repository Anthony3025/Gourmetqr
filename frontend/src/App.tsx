import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Menu } from './pages/Menu';
import { Cocina } from './pages/Cocina';
import Admin from './pages/Admin';
import Superadmin from './pages/Superadmin';

import { API_BASE } from './config';

// Interceptar todas las llamadas a fetch para adjuntar cookies de forma automática (HttpOnly)
const originalFetch = window.fetch;
window.fetch = function (input, init = {}) {
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
  if (url.includes('/api/')) {
    init.credentials = 'include';
  }
  return originalFetch(input, init);
};

function Portal() {
  return (
    <div style={{
      background: 'radial-gradient(circle at top right, #1e1e38, #0b0f19 80%)',
      color: '#fff',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '10px', color: '#ff5a1f' }}>Gourmet QR</h1>
      <p style={{ color: '#a0aec0', maxWidth: '400px', fontSize: '15px', lineHeight: '1.6', margin: '0 0 20px 0' }}>
        Plataforma de menú digital y comandas en tiempo real. Por favor, utiliza el enlace directo de tu restaurante (ej: /mi-restaurante/menu).
      </p>
      <div>
        <a href="/superadmin" style={{ textDecoration: 'none', background: '#ff5a1f', color: '#fff', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', display: 'inline-block' }}>
          Portal Superadmin ↗
        </a>
      </div>
    </div>
  );
}

function App() {
  // Cargar configuración de marca (Color de acento) al inicializar la aplicación
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const searchParams = new URLSearchParams(window.location.search);
    const slug = pathParts[1] && ['menu', 'cocina', 'admin', 'superadmin'].indexOf(pathParts[1]) === -1
      ? pathParts[1]
      : searchParams.get('restaurant');

    if (slug) {
      const apiBase = API_BASE;
      fetch(`${apiBase}/api/${slug}/settings`)
        .then(res => res.json())
        .then(data => {
          if (data.accentColor) {
            document.documentElement.style.setProperty('--accent', data.accentColor);
          }
        })
        .catch(err => console.error('Error al cargar color de acento:', err));
    }
  }, []);

  return (
    <Router>
      <Routes>
        {/* Portal principal */}
        <Route path="/" element={<Portal />} />

        {/* Ruta global de súper administración */}
        <Route path="/superadmin" element={<Superadmin />} />

        {/* Rutas principales con slug dinámico */}
        <Route path="/:restaurantSlug/menu" element={<Menu />} />
        <Route path="/:restaurantSlug/cocina" element={<Cocina />} />
        <Route path="/:restaurantSlug/admin" element={<Admin />} />

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
