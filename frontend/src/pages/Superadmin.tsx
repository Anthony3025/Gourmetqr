import React, { useState, useEffect } from 'react';
import './Superadmin.css';
import { API_BASE } from '../config';

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
  const apiBase = API_BASE;

  // Autenticación
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
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
  const [kitchenPin, setKitchenPin] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [adminEmail, setAdminEmail] = useState('');

  const [submitError, setSubmitError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Éxito de creación (WhatsApp)
  const [createdTenant, setCreatedTenant] = useState<{ email: string; tempPass: string; slug: string } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Verificar sesión en carga inicial por Cookies
  useEffect(() => {
    fetch(`${apiBase}/api/auth/me`)
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        if (data.success && data.user.role === 'superadmin') {
          setIsAuthenticated(true);
          fetchRestaurants();
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
      })
      .finally(() => {
        setIsLoadingSession(false);
      });
  }, []);

  const fetchRestaurants = () => {
    setLoadingData(true);
    setErrorMsg('');
    fetch(`${apiBase}/api/superadmin/restaurants`)
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

    fetch(`${apiBase}/api/auth/login`, {
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
    fetch(`${apiBase}/api/auth/logout`, { method: 'POST' })
      .finally(() => {
        setIsAuthenticated(false);
        setRestaurants([]);
      });
  };

  const handleCreateRestaurant = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitLoading(true);

    const payload = {
      adminEmail
    };

    fetch(`${apiBase}/api/superadmin/restaurants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(d => { throw new Error(d.error || 'Error al crear el restaurante'); });
        }
        return res.json();
      })
      .then(data => {
        setCreatedTenant({
          email: adminEmail,
          tempPass: data.temporaryPassword,
          slug: data.restaurant.slug
        });
        setAdminEmail('');
        setShowCreateModal(false);
        setShowSuccessModal(true);
        setSubmitLoading(false);
        fetchRestaurants();
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
      method: 'DELETE'
    })
      .then(res => {
        if (!res.ok) throw new Error('No se pudo eliminar el restaurante.');
        return res.json();
      })
      .then(() => {
        fetchRestaurants();
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
        'Content-Type': 'application/json'
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
        'Content-Type': 'application/json'
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
        fetchRestaurants();
      })
      .catch(err => {
        console.error(err);
        setSubmitError(err.message);
        setSubmitLoading(false);
      });
  };

  if (isLoadingSession) {
    return (
      <div className="superadmin-login-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ color: '#fff', fontSize: '15px', fontWeight: 'bold' }}>Cargando panel...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="superadmin-login-container">
        <div className="superadmin-login-card">
          <div className="superadmin-login-header">
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
          <h2>Restaurantes</h2>
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
                        {rest.isActive !== false ? 'Activo' : 'Suspendido'}
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
                 <label>Correo Electrónico del Administrador</label>
                 <input
                   type="email"
                   placeholder="admin@restaurante.com"
                   value={adminEmail}
                   onChange={e => setAdminEmail(e.target.value)}
                   required
                 />
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

      {/* Modal Éxito y WhatsApp */}
      {showSuccessModal && createdTenant && (
        <div className="sa-modal-overlay">
          <div className="sa-modal" style={{ maxWidth: '450px' }}>
            <div className="sa-modal-header" style={{ justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '22px' }}>¡Restaurante Registrado!</h3>
            </div>
            <div className="sa-modal-body" style={{ padding: '20px 0' }}>
              <p style={{ color: 'var(--sa-text-muted)', marginBottom: '15px', fontSize: '14.5px', lineHeight: '1.5' }}>
                Se ha generado la cuenta y una contraseña temporal. Envía los accesos a tu cliente:
              </p>
              
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '10px', border: '1px solid var(--sa-border)', marginBottom: '20px', fontFamily: 'monospace', fontSize: '13.5px', whiteSpace: 'pre-wrap', color: '#e2e8f0', lineHeight: '1.6' }}>
{`Acceso Administrador:
URL: ${window.location.origin}/${createdTenant.slug}/admin
Correo: ${createdTenant.email}
Contraseña Temporal: ${createdTenant.tempPass}`}
              </div>

              <button
                type="button"
                onClick={() => {
                  const message = encodeURIComponent(
                    `¡Hola! Tu cuenta en Gourmet QR ya está lista.\n\n` +
                    `Ingresa a tu panel desde aquí:\n` +
                    `${window.location.origin}/${createdTenant.slug}/admin\n\n` +
                    `Tus credenciales de acceso temporal:\n` +
                    `Usuario: ${createdTenant.email}\n` +
                    `Contraseña: ${createdTenant.tempPass}\n\n` +
                    `Al ingresar, te guiaremos paso a paso en tu primera configuración de marca.`
                  );
                  window.open(`https://wa.me/?text=${message}`, '_blank');
                }}
                className="btn-primary"
                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '14px', fontSize: '15px', background: '#25D366', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)' }}
              >
                Enviar por WhatsApp
              </button>
            </div>
            <div className="sa-modal-footer">
              <button 
                type="button" 
                onClick={() => { setShowSuccessModal(false); setCreatedTenant(null); }} 
                className="btn-submit"
                style={{ width: '100%' }}
              >
                Entendido
              </button>
            </div>
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
