import React, { useState, useEffect } from 'react';
import './Superadmin.css';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  accentColor: string;
  currency: string;
  kitchenPin: string;
  isActive?: boolean;
  createdAt: string;
  users: {
    id: string;
    email: string;
    name: string | null;
  }[];
}

export default function Superadmin() {
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // Autenticación
  const [token, setToken] = useState<string>(localStorage.getItem('superadmin_token') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);

  // Datos
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modales y formularios
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRest, setSelectedRest] = useState<Restaurant | null>(null);

  // Formulario de creación
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [accentColor, setAccentColor] = useState('#ff5a1f');
  const [currency, setCurrency] = useState('$');
  const [kitchenPin, setKitchenPin] = useState('1234');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminName, setAdminName] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Verificar token en carga inicial
  useEffect(() => {
    if (token) {
      // Intentar validar decodificando el rol o haciendo un fetch simple
      setIsAuthenticated(true);
      fetchRestaurants(token);
    }
  }, [token]);

  const fetchRestaurants = (authToken: string) => {
    setLoadingData(true);
    setErrorMsg('');
    fetch(`${apiBase}/api/superadmin/restaurants`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('No autorizado para ver este panel.');
        return res.json();
      })
      .then(data => {
        setRestaurants(data);
        setLoadingData(false);
      })
      .catch(err => {
        console.error(err);
        setErrorMsg(err.message);
        setLoadingData(false);
        // Si no está autorizado, limpiar sesión
        handleLogout();
      });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      setAuthError('Todos los campos son obligatorios.');
      return;
    }

    setLoadingAuth(true);
    setAuthError('');

    fetch(`${apiBase}/api/gourmet-qr/login`, { // slug por defecto para login general
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput, password: passwordInput })
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(d => { throw new Error(d.error || 'Credenciales incorrectas'); });
        }
        return res.json();
      })
      .then(data => {
        if (data.user && data.user.role === 'superadmin') {
          localStorage.setItem('superadmin_token', data.token);
          setToken(data.token);
          setIsAuthenticated(true);
        } else {
          throw new Error('Acceso denegado. Se requiere cuenta de Súper-Administrador.');
        }
        setLoadingAuth(false);
      })
      .catch(err => {
        console.error(err);
        setAuthError(err.message);
        setLoadingAuth(false);
      });
  };

  const handleLogout = () => {
    localStorage.removeItem('superadmin_token');
    setToken('');
    setIsAuthenticated(false);
    setRestaurants([]);
  };

  const handleCreateRestaurant = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitLoading(true);

    const generatedSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    const payload = {
      name,
      slug: generatedSlug,
      accentColor: '#ff5a1f',
      currency: '$',
      kitchenPin: '1234',
      adminEmail,
      adminPassword,
      adminName
    };

    fetch(`${apiBase}/api/superadmin/restaurants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(d => { throw new Error(d.error || 'Error al crear el restaurante'); });
        }
        return res.json();
      })
      .then(() => {
        // Limpiar formulario y cerrar modal
        setName('');
        setSlug('');
        setAccentColor('#ff5a1f');
        setCurrency('$');
        setKitchenPin('1234');
        setAdminEmail('');
        setAdminPassword('');
        setAdminName('');
        setShowCreateModal(false);
        setSubmitLoading(false);
        // Recargar lista
        fetchRestaurants(token);
      })
      .catch(err => {
        console.error(err);
        setSubmitError(err.message);
        setSubmitLoading(false);
      });
  };

  const handleDeleteRestaurant = (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el restaurante "${name}"? Esto borrará permanentemente sus productos, categorías, órdenes y usuarios.`)) {
      return;
    }

    fetch(`${apiBase}/api/superadmin/restaurants/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('No se pudo eliminar el restaurante.');
        return res.json();
      })
      .then(() => {
        fetchRestaurants(token);
      })
      .catch(err => {
        console.error(err);
        alert(err.message);
      });
  };

  const toggleRestaurantActive = (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // Actualización optimista de estado local en la grilla
    setRestaurants(prev => prev.map(r => r.id === id ? { ...r, isActive: newStatus } : r));

    fetch(`${apiBase}/api/superadmin/restaurants/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ isActive: newStatus })
    })
      .then(res => {
        if (!res.ok) throw new Error('No se pudo cambiar el estado.');
        return res.json();
      })
      .catch(err => {
        console.error(err);
        // Rollback en caso de error
        setRestaurants(prev => prev.map(r => r.id === id ? { ...r, isActive: currentStatus } : r));
        alert('Error al cambiar el estado del negocio.');
      });
  };

  const handleEditClick = (rest: Restaurant) => {
    setSelectedRest(rest);
    setName(rest.name);
    setSlug(rest.slug);
    setAccentColor(rest.accentColor);
    setCurrency(rest.currency);
    setKitchenPin(rest.kitchenPin);
    setSubmitError('');
    setShowEditModal(true);
  };

  const handleUpdateRestaurant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRest) return;

    setSubmitError('');
    setSubmitLoading(true);

    const payload = {
      name,
      slug: slug.toLowerCase().replace(/\s+/g, '-'),
      accentColor,
      currency,
      kitchenPin
    };

    fetch(`${apiBase}/api/superadmin/restaurants/${selectedRest.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(d => { throw new Error(d.error || 'Error al actualizar'); });
        }
        return res.json();
      })
      .then(() => {
        setShowEditModal(false);
        setSelectedRest(null);
        setSubmitLoading(false);
        fetchRestaurants(token);
      })
      .catch(err => {
        console.error(err);
        setSubmitError(err.message);
        setSubmitLoading(false);
      });
  };

  if (!isAuthenticated) {
    return (
      <div className="superadmin-login-container">
        <div className="superadmin-login-card">
          <div className="superadmin-login-header">
            <span className="logo-icon">👑</span>
            <h2>Gourmet QR</h2>
            <p>Panel de Súper-Administración</p>
          </div>
          <form onSubmit={handleLogin} className="superadmin-login-form">
            <div className="form-group">
              <label>Correo Electrónico</label>
              <input
                type="email"
                placeholder="correo@ejemplo.com"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                required
              />
            </div>
            {authError && <div className="auth-error-msg">{authError}</div>}
            <button type="submit" className="btn-login" disabled={loadingAuth}>
              {loadingAuth ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="superadmin-dashboard">
      {/* Header */}
      <header className="superadmin-header">
        <div className="header-logo">
          <span className="crown-icon">👑</span>
          <div>
            <h1>Gourmet QR</h1>
            <p>Consola de Gestión Global</p>
          </div>
        </div>
        <button onClick={handleLogout} className="btn-logout">
          Cerrar Sesión
        </button>
      </header>

      {/* Main Content */}
      <main className="superadmin-content">
        {/* Tarjetas de Métricas Simplificadas */}
        <div className="sa-metrics-grid">
          <div className="sa-metric-card">
            <h4>Negocios Totales</h4>
            <div className="metric-number">{restaurants.length}</div>
          </div>
          <div className="sa-metric-card">
            <h4>Negocios Activos</h4>
            <div className="metric-number">{restaurants.filter(r => r.isActive !== false).length}</div>
          </div>
          <div className="sa-metric-card">
            <h4>MRR Estimado</h4>
            <div className="metric-number">${(restaurants.filter(r => r.isActive !== false).length * 19.99).toFixed(2)}</div>
          </div>
        </div>

        <div className="content-header">
          <h2>Restaurantes Inquilinos (Tenants)</h2>
          <button onClick={() => { setSubmitError(''); setShowCreateModal(true); }} className="btn-primary">
            + Nuevo Restaurante
          </button>
        </div>

        {errorMsg && <div className="error-banner">{errorMsg}</div>}

        {loadingData ? (
          <div className="sa-loading-container">
            <div className="sa-spinner"></div>
            <p>Cargando lista de inquilinos...</p>
          </div>
        ) : (
          <div className="restaurants-grid">
            {restaurants.length === 0 ? (
              <div className="empty-state">
                <p>No hay restaurantes creados todavía.</p>
              </div>
            ) : (
              restaurants.map(rest => (
                <div className="restaurant-card" key={rest.id}>
                  <div className="restaurant-card-header">
                    <div className="accent-indicator" style={{ backgroundColor: rest.accentColor }}></div>
                    <h3>{rest.name}</h3>
                  </div>
                  <div className="restaurant-card-body">
                    <p>
                      <strong>Enlace Carta:</strong><br />
                      <a 
                        href={`${window.location.origin}/${rest.slug}/menu`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="rest-menu-link"
                      >
                        /{rest.slug}/menu ↗
                      </a>
                    </p>
                    <p>
                      <strong>Administrador:</strong><br />
                      {rest.users[0] ? (
                        <span className="admin-email-text">{rest.users[0].email}</span>
                      ) : (
                        <span className="no-admin-text">Sin Administrador</span>
                      )}
                    </p>
                    
                    {/* Toggle de Estado Activo/Suspendido */}
                    <div className="sa-status-toggle">
                      <span>Estado:</span>
                      <button
                        type="button"
                        onClick={() => toggleRestaurantActive(rest.id, rest.isActive !== false)}
                        className={`status-toggle-btn ${rest.isActive !== false ? 'active' : 'suspended'}`}
                      >
                        {rest.isActive !== false ? '🟢 Activo' : '🔴 Suspendido'}
                      </button>
                    </div>
                  </div>
                  <div className="restaurant-card-footer">
                    <button onClick={() => handleEditClick(rest)} className="btn-secondary">Editar</button>
                    <button onClick={() => handleDeleteRestaurant(rest.id, rest.name)} className="btn-danger">Eliminar</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Modal Crear */}
      {showCreateModal && (
        <div className="sa-modal-overlay">
          <div className="sa-modal">
            <div className="sa-modal-header">
              <h3>Crear Nuevo Restaurante</h3>
              <button onClick={() => setShowCreateModal(false)} className="btn-close">×</button>
            </div>
            <form onSubmit={handleCreateRestaurant} className="sa-modal-form">
              <div className="form-group">
                <label>Nombre del Negocio / Restaurante</label>
                <input
                  type="text"
                  placeholder="Ej. Hamburguesas Deluxe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

              <hr className="sa-divider" />
              <h4>Cuenta del Administrador de Local</h4>

              <div className="form-group">
                <label>Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={adminName}
                  onChange={e => setAdminName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="admin@deluxe.com"
                    value={adminEmail}
                    onChange={e => setAdminEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Contraseña</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {submitError && <div className="submit-error-msg">{submitError}</div>}

              <div className="sa-modal-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-cancel">Cancelar</button>
                <button type="submit" className="btn-submit" disabled={submitLoading}>
                  {submitLoading ? 'Creando...' : 'Crear Restaurante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {showEditModal && (
        <div className="sa-modal-overlay">
          <div className="sa-modal">
            <div className="sa-modal-header">
              <h3>Editar Restaurante</h3>
              <button onClick={() => { setShowEditModal(false); setSelectedRest(null); }} className="btn-close">×</button>
            </div>
            <form onSubmit={handleUpdateRestaurant} className="sa-modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre del Restaurante</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Slug URL</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={e => setSlug(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Color de Acento (HEX)</label>
                  <input
                    type="color"
                    value={accentColor}
                    onChange={e => setAccentColor(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Símbolo de Moneda</label>
                  <input
                    type="text"
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>PIN de Cocina</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={kitchenPin}
                    onChange={e => setKitchenPin(e.target.value)}
                    required
                  />
                </div>
              </div>

              {submitError && <div className="submit-error-msg">{submitError}</div>}

              <div className="sa-modal-footer">
                <button type="button" onClick={() => { setShowEditModal(false); setSelectedRest(null); }} className="btn-sa-cancel">Cancelar</button>
                <button type="submit" className="btn-submit" disabled={submitLoading}>
                  {submitLoading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
