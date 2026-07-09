import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Menu } from './pages/Menu';
import { Cocina } from './pages/Cocina';
import Admin from './pages/Admin';

function App() {
  // Cargar configuración de marca (Color de acento) al inicializar la aplicación
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const searchParams = new URLSearchParams(window.location.search);
    // Resolver slug del path (ej: /gourmet-qr/menu) o query (ej: ?restaurant=gourmet-qr)
    const slug = pathParts[1] && ['menu', 'cocina', 'admin'].indexOf(pathParts[1]) === -1
      ? pathParts[1]
      : searchParams.get('restaurant') || 'gourmet-qr';

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    fetch(`${apiBase}/api/${slug}/settings`)
      .then(res => res.json())
      .then(data => {
        if (data.accentColor) {
          document.documentElement.style.setProperty('--accent', data.accentColor);
        }
      })
      .catch(err => console.error('Error al inicializar branding:', err));
  }, []);

  return (
    <Router>
      <Routes>
        {/* Rutas principales con slug dinámico */}
        <Route path="/:restaurantSlug/menu" element={<Menu />} />
        <Route path="/:restaurantSlug/cocina" element={<Cocina />} />
        <Route path="/:restaurantSlug/admin" element={<Admin />} />

        {/* Fallbacks para compatibilidad con las URLs locales anteriores */}
        <Route path="/menu" element={<Menu />} />
        <Route path="/cocina" element={<Cocina />} />
        <Route path="/admin" element={<Admin />} />
        
        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/gourmet-qr/menu" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
