import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import './Admin.css';

interface Product {
  id: string;
  name: string;
  price: string;
  imageUrl: string | null;
  isActive: boolean;
}

interface Category {
  id: string;
  name: string;
  products: Product[];
}

interface Stats {
  totalSales: number;
  ordersCount: number;
  activeTablesCount: number;
  averageKitchenTime: number;
}

interface Settings {
  name: string;
  logoUrl?: string | null;
  accentColor: string;
  currency: string;
  kitchenPin: string;
  adminEmail: string;
}

type Tab = 'overview' | 'menu' | 'tables' | 'settings' | 'staff';

const commonCurrencies = [
  { label: 'Dólar Estadounidense ($)', symbol: '$' },
  { label: 'Euro (€)', symbol: '€' },
  { label: 'Peso Mexicano ($)', symbol: '$' },
  { label: 'Peso Colombiano ($)', symbol: '$' },
  { label: 'Peso Chileno ($)', symbol: '$' },
  { label: 'Sol Peruano (S/)', symbol: 'S/' },
  { label: 'Bolívar Venezolano (Bs.)', symbol: 'Bs.' },
];

interface StaffMember {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

function StaffTab({ token, restaurantSlug, apiBase }: { token: string; restaurantSlug: string; apiBase: string }) {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchStaff = () => {
    setLoading(true);
    fetch(`${apiBase}/api/${restaurantSlug}/staff`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al obtener personal');
        return res.json();
      })
      .then(data => {
        setStaffList(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    fetch(`${apiBase}/api/${restaurantSlug}/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ email, password, name })
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(d => { throw new Error(d.error || 'Error al agregar personal'); });
        }
        return res.json();
      })
      .then(() => {
        setSuccess('Miembro de personal agregado con éxito.');
        setEmail('');
        setPassword('');
        setName('');
        fetchStaff();
      })
      .catch(err => {
        setError(err.message);
      });
  };

  const handleDeleteStaff = (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar a ${name} del personal?`)) return;

    fetch(`${apiBase}/api/${restaurantSlug}/staff/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al eliminar');
        return res.json();
      })
      .then(() => {
        fetchStaff();
      })
      .catch(err => {
        console.error(err);
        alert(err.message);
      });
  };

  return (
    <div className="admin-card animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', maxWidth: '1000px' }}>
      <div className="sa-card-section" style={{ textAlign: 'left' }}>
        <h3 className="card-title-admin" style={{ marginBottom: '20px' }}>Agregar Miembro de Personal</h3>
        <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group-admin">
            <label>Nombre Completo</label>
            <input
              type="text"
              className="form-input-admin"
              placeholder="Ej. Carlos Cocinero"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group-admin">
            <label>Correo Electrónico</label>
            <input
              type="email"
              className="form-input-admin"
              placeholder="carlos@restaurante.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group-admin">
            <label>Contraseña</label>
            <input
              type="password"
              className="form-input-admin"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="auth-error-msg" style={{ color: 'var(--danger)', fontSize: '13px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>{error}</div>}
          {success && <div style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '13px', textAlign: 'center' }}>{success}</div>}
          <button type="submit" className="btn-admin-action" style={{ width: '100%' }}>Agregar a Personal</button>
        </form>
      </div>
      <div className="sa-card-section" style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '28px', textAlign: 'left' }}>
        <h3 className="card-title-admin" style={{ marginBottom: '20px' }}>Lista de Personal</h3>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Cargando personal...</p>
        ) : staffList.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No hay personal registrado.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
            {staffList.map(member => (
              <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', color: '#fff' }}>{member.name}</h4>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{member.email}</span>
                </div>
                <button
                  onClick={() => handleDeleteStaff(member.id, member.name || '')}
                  className="btn-admin-secondary"
                  style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)', padding: '6px 10px', fontSize: '12px' }}
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Admin() {
  const { socket } = useSocket();
  const { restaurantSlug: urlSlug } = useParams<{ restaurantSlug: string }>();
  const restaurantSlug = urlSlug || 'gourmet-qr';
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // Autenticación por Correo y Contraseña
  const [token, setToken] = useState<string>(localStorage.getItem('admin_token') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('admin_token'));
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);

  // Navegación de Pestañas (Sidebar)
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Estados Operativos
  const [menu, setMenu] = useState<Category[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalSales: 0,
    ordersCount: 0,
    activeTablesCount: 0,
    averageKitchenTime: 0
  });
  
  // Ajustes de Marca
  const [settings, setSettings] = useState<Settings>({
    name: 'Gourmet QR',
    accentColor: '#ff5a1f',
    currency: '$',
    kitchenPin: '1234',
    adminEmail: 'admin@gourmet.com'
  });
  const [newPassword, setNewPassword] = useState('');

  // Onboarding Wizard
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingSlug, setOnboardingSlug] = useState('');
  const [onboardingPassword, setOnboardingPassword] = useState('');
  const [onboardingCurrency, setOnboardingCurrency] = useState('$');
  const [onboardingAccentColor, setOnboardingAccentColor] = useState('#ff5a1f');
  const [onboardingKitchenPin, setOnboardingKitchenPin] = useState('1234');
  const [onboardingLogoBase64, setOnboardingLogoBase64] = useState('');
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingError, setOnboardingError] = useState('');
  const [onboardingSubmitting, setOnboardingSubmitting] = useState(false);
  const [showOnboardingSuccess, setShowOnboardingSuccess] = useState(false);
  const [savedSlug, setSavedSlug] = useState('');

  const [selectedCurrencyOption, setSelectedCurrencyOption] = useState('$');
  const [customCurrencySymbol, setCustomCurrencySymbol] = useState('');
  const [logoBase64, setLogoBase64] = useState('');

  // Generador de QR
  const [mesaInput, setMesaInput] = useState('1');
  const [generatedQrUrl, setGeneratedQrUrl] = useState('');
  const [qrMode, setQrMode] = useState<'individual' | 'batch'>('individual');
  const [rangeStart, setRangeStart] = useState('1');
  const [rangeEnd, setRangeEnd] = useState('10');
  const [bulkQrs, setBulkQrs] = useState<{ mesa: string; url: string; qrUrl: string }[]>([]);
  const [loadingPdf, setLoadingPdf] = useState(false);

  // Estados para creación de Categorías y Platos
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddProductForm, setShowAddProductForm] = useState(false);
  const [targetCategoryId, setTargetCategoryId] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductTags, setNewProductTags] = useState('');
  const [newProductImageBase64, setNewProductImageBase64] = useState('');

  // Carga inicial de settings básicos
  useEffect(() => {
    fetch(`${apiBase}/api/${restaurantSlug}/settings`)
      .then(res => res.json())
      .then((data: Settings) => {
        setSettings(data);
        const matching = commonCurrencies.find(c => c.symbol === data.currency);
        if (matching) {
          setSelectedCurrencyOption(data.currency);
        } else {
          setSelectedCurrencyOption('custom');
          setCustomCurrencySymbol(data.currency || '');
        }
      })
      .catch(err => console.error('Error al obtener ajustes:', err));
  }, []);

  // Carga de datos operativos al autenticar
  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated]);

  const loadDashboardData = () => {
    // Cargar menú (público)
    fetch(`${apiBase}/api/${restaurantSlug}/menu`)
      .then(res => res.json())
      .then((data: Category[]) => setMenu(data))
      .catch(err => console.error('Error al cargar menú en admin:', err));

    // Cargar estadísticas (protegido por JWT)
    const activeToken = token || localStorage.getItem('admin_token');
    if (!activeToken) return;
    fetch(`${apiBase}/api/${restaurantSlug}/stats`, {
      headers: { 'Authorization': `Bearer ${activeToken}` }
    })
      .then(res => {
        if (res.status === 401 || res.status === 403) {
          handleLogout();
          throw new Error('Sesión expirada');
        }
        return res.json();
      })
      .then((data: Stats) => setStats(data))
      .catch(err => console.error('Error al cargar estadísticas:', err));
  };

  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingError('');
    setOnboardingSubmitting(true);

    const slugToSave = onboardingSlug.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

    fetch(`${apiBase}/api/${restaurantSlug}/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || localStorage.getItem('admin_token')}`
      },
      body: JSON.stringify({
        name: onboardingName,
        slug: slugToSave,
        currency: onboardingCurrency,
        accentColor: onboardingAccentColor,
        kitchenPin: onboardingKitchenPin,
        logoBase64: onboardingLogoBase64 || undefined,
        adminPassword: onboardingPassword
      })
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(d => { throw new Error(d.error || 'Error al guardar configuración'); });
        }
        return res.json();
      })
      .then(() => {
        // Guardar el slug final para el redirect
        setSavedSlug(slugToSave);
        setShowOnboardingSuccess(true);
        setOnboardingSubmitting(false);
      })
      .catch(err => {
        console.error(err);
        setOnboardingError(err.message);
        setOnboardingSubmitting(false);
      });
  };

  // Escuchar WebSockets
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const handleRefreshStats = () => {
      const activeToken = token || localStorage.getItem('admin_token');
      if (!activeToken) return;
      fetch(`${apiBase}/api/${restaurantSlug}/stats`, {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      })
        .then(res => {
          if (res.status === 401 || res.status === 403) {
            handleLogout();
          }
          return res.json();
        })
        .then((data: Stats) => setStats(data))
        .catch(err => console.error('Error al actualizar estadísticas:', err));
    };

    socket.on('new_order', handleRefreshStats);
    socket.on('order_updated', handleRefreshStats);

    return () => {
      socket.off('new_order', handleRefreshStats);
      socket.off('order_updated', handleRefreshStats);
    };
  }, [socket, isAuthenticated]);

  // Manejar Formulario de Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAuth(true);
    setAuthError('');

    // Usamos el endpoint genérico /api/auth/login para que funcione
    // sin importar el slug (nuevo tenant con slug temporal, etc.)
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
      .then((data: { token: string; user: { role: string }; restaurant?: { slug: string } | null }) => {
        // Solo admin y superadmin pueden acceder al panel
        if (data.user.role !== 'admin' && data.user.role !== 'superadmin') {
          throw new Error('No tienes permisos para acceder al panel de administración.');
        }
        localStorage.setItem('admin_token', data.token);
        setToken(data.token);
        setIsAuthenticated(true);
        setAuthError('');

        // Si el usuario tiene un slug asignado, redirigir a su panel correcto
        // Esto garantiza que React Router cargue el slug real y no el fallback 'gourmet-qr'
        if (data.restaurant?.slug) {
          window.location.href = `/${data.restaurant.slug}/admin`;
        }
      })
      .catch(err => {
        setAuthError(err.message || 'Error al iniciar sesión');
      })
      .finally(() => {
        setLoadingAuth(false);
      });
  };

  // Subir Logo (base64)
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Guardar Ajustes de Branding y Credenciales
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      ...settings,
      logoBase64: logoBase64 || undefined,
      adminPassword: newPassword // Se envía solo si el usuario completó el campo
    };

    fetch(`${apiBase}/api/${restaurantSlug}/settings`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then((updated: Settings) => {
        setSettings(updated);
        setLogoBase64('');
        setNewPassword(''); // Limpiar campo de nueva contraseña
        document.documentElement.style.setProperty('--accent', updated.accentColor);
        alert('Ajustes y credenciales guardados correctamente.');
      })
      .catch(err => {
        console.error('Error al guardar ajustes:', err);
        alert('Error al guardar ajustes.');
      });
  };

  // Cambiar disponibilidad (Stock Switch)
  const handleToggleProductStock = (productId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;

    fetch(`${apiBase}/api/${restaurantSlug}/products/${productId}/availability`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ isActive: nextStatus })
    })
      .then(res => res.json())
      .then(() => {
        setMenu(prevMenu =>
          prevMenu.map(cat => ({
            ...cat,
            products: cat.products.map(p =>
              p.id === productId ? { ...p, isActive: nextStatus } : p
            )
          }))
        );
      })
      .catch(err => console.error('Error al cambiar stock:', err));
  };

  // Guardar precio del producto
  const handleSaveProductPrice = (productId: string, newPrice: string) => {
    fetch(`${apiBase}/api/${restaurantSlug}/products/${productId}/price`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ price: parseFloat(newPrice) })
    })
      .then(res => res.json())
      .then(() => {
        setMenu(prevMenu =>
          prevMenu.map(cat => ({
            ...cat,
            products: cat.products.map(p =>
              p.id === productId ? { ...p, price: newPrice } : p
            )
          }))
        );
      })
      .catch(err => console.error('Error al guardar precio:', err));
  };

  // A. Crear categoría
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    fetch(`${apiBase}/api/${restaurantSlug}/categories`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name: newCategoryName })
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al crear categoría');
        return res.json();
      })
      .then((newCat) => {
        setMenu(prev => [...prev, { ...newCat, products: [] }]);
        setNewCategoryName('');
      })
      .catch(err => {
        console.error(err);
        alert('No se pudo crear la categoría.');
      });
  };

  // B. Eliminar categoría
  const handleDeleteCategory = (categoryId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta categoría y todos sus platos asociados?')) return;

    fetch(`${apiBase}/api/${restaurantSlug}/categories/${categoryId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al eliminar categoría');
        return res.json();
      })
      .then(() => {
        setMenu(prev => prev.filter(c => c.id !== categoryId));
      })
      .catch(err => {
        console.error(err);
        alert('No se pudo eliminar la categoría.');
      });
  };

  // C. Subir imagen (base64)
  const handleProductFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewProductImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // D. Crear producto
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim() || !newProductPrice || !targetCategoryId) return;

    const tagsArr = newProductTags.split(',').map(t => t.trim()).filter(Boolean);

    fetch(`${apiBase}/api/${restaurantSlug}/products`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: newProductName,
        description: newProductDesc,
        price: parseFloat(newProductPrice),
        categoryId: targetCategoryId,
        tags: tagsArr,
        imageBase64: newProductImageBase64
      })
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al crear el producto');
        return res.json();
      })
      .then((newProd) => {
        setMenu(prev => prev.map(c => {
          if (c.id === targetCategoryId) {
            return {
              ...c,
              products: [...c.products, newProd]
            };
          }
          return c;
        }));
        
        // Limpiar campos
        setNewProductName('');
        setNewProductDesc('');
        setNewProductPrice('');
        setNewProductTags('');
        setNewProductImageBase64('');
        setShowAddProductForm(false);
      })
      .catch(err => {
        console.error(err);
        alert('No se pudo añadir el plato.');
      });
  };

  // E. Eliminar producto
  const handleDeleteProduct = (productId: string, categoryId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este plato?')) return;

    fetch(`${apiBase}/api/${restaurantSlug}/products/${productId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al eliminar producto');
        return res.json();
      })
      .then(() => {
        setMenu(prev => prev.map(c => {
          if (c.id === categoryId) {
            return {
              ...c,
              products: c.products.filter(p => p.id !== productId)
            };
          }
          return c;
        }));
      })
      .catch(err => {
        console.error(err);
        alert('No se pudo eliminar el plato.');
      });
  };

  // Generar QR Individual reactivamente al cambiar mesaInput o qrMode
  useEffect(() => {
    if (qrMode === 'individual' && mesaInput.trim() !== '') {
      const host = window.location.host;
      const protocol = window.location.protocol;
      const urlMesa = `${protocol}//${host}/menu?mesa=${mesaInput}&restaurant=${restaurantSlug}`;
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(urlMesa)}`;
      setGeneratedQrUrl(qrApiUrl);
    } else if (mesaInput.trim() === '') {
      setGeneratedQrUrl('');
    }
  }, [mesaInput, qrMode]);

  // Generar Lote de QRs reactivamente al cambiar rangeStart, rangeEnd o qrMode
  useEffect(() => {
    if (qrMode === 'batch') {
      const host = window.location.host;
      const protocol = window.location.protocol;
      const start = parseInt(rangeStart);
      const end = parseInt(rangeEnd);
      
      if (isNaN(start) || isNaN(end) || start > end || (end - start) > 50 || start < 1) {
        setBulkQrs([]);
        return;
      }

      const generatedList = [];
      for (let i = start; i <= end; i++) {
        const mesaStr = String(i);
        const urlMesa = `${protocol}//${host}/menu?mesa=${mesaStr}&restaurant=${restaurantSlug}`;
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(urlMesa)}`;
        generatedList.push({
          mesa: mesaStr,
          url: urlMesa,
          qrUrl: qrApiUrl
        });
      }
      setBulkQrs(generatedList);
    }
  }, [rangeStart, rangeEnd, qrMode]);

  // Descargar PDF del QR Individual mediante html2pdf.js en el cliente
  const downloadIndividualQrPdf = () => {
    const element = document.getElementById('qr-card-individual');
    if (!element) {
      alert('No se encontró el elemento a imprimir.');
      return;
    }
    const opt = {
      margin:       0,
      filename:     `QR_Mesa_${mesaInput}_${settings.name.replace(/\s+/g, '_')}.pdf`,
      image:        { type: 'jpeg' as const, quality: 1.0 },
      html2canvas:  { scale: 3, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: [90, 130] as [number, number], orientation: 'portrait' as const }
    };
    setLoadingPdf(true);
    html2pdf().set(opt).from(element).save()
      .then(() => setLoadingPdf(false))
      .catch(() => setLoadingPdf(false));
  };

  // Descargar PDF por Lote mediante html2pdf.js en el cliente (4 por página Carta)
  const downloadBulkQrPdf = () => {
    const element = document.getElementById('qr-cards-batch');
    if (!element) {
      alert('No se encontraron los elementos a imprimir.');
      return;
    }
    const opt = {
      margin:       [8, 12, 8, 12] as [number, number, number, number],
      filename:     `QRs_Lote_${rangeStart}_al_${rangeEnd}_${settings.name.replace(/\s+/g, '_')}.pdf`,
      image:        { type: 'jpeg' as const, quality: 1.0 },
      html2canvas:  { scale: 3, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' as const }
    };
    setLoadingPdf(true);
    html2pdf().set(opt).from(element).save()
      .then(() => setLoadingPdf(false))
      .catch(() => setLoadingPdf(false));
  };

  // Cerrar Sesión
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken('');
    setIsAuthenticated(false);
    setEmailInput('');
    setPasswordInput('');
    setActiveTab('overview');
  };

  // PANTALLA 1: Login de Correo y Contraseña
  if (!isAuthenticated) {
    return (
      <div className="login-overlay">
        <div className="login-card">
          <h2 className="waiting-title">Administración</h2>
          <p className="waiting-subtitle" style={{ marginBottom: '20px' }}>Inicia sesión para gestionar tu restaurante</p>
          
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
            <input
              type="email"
              className="form-input-admin"
              placeholder="Correo electrónico"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              required
            />
            
            <input
              type="password"
              className="form-input-admin"
              placeholder="Contraseña"
              value={passwordInput}
              onChange={e => setPasswordInput(e.target.value)}
              required
            />

            {authError && (
              <p style={{ color: 'var(--danger)', fontSize: '13px', margin: '4px 0' }}>
                {authError}
              </p>
            )}

            <button 
              type="submit" 
              className="btn-admin-action" 
              style={{ width: '100%', marginTop: '10px' }}
              disabled={loadingAuth}
            >
              {loadingAuth ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // PANTALLA 2: Dashboard Principal Rediseñado
  return (
    <div className="admin-container animate-fade-in">

      {/* Asistente de Onboarding Wizard para Cuentas Nuevas */}
      {settings.name === "Nombre Temporal" && (
        <div className="login-overlay" style={{ zIndex: 1000, background: 'radial-gradient(circle at top right, #1e1e38, #0b0f19 80%)' }}>
          <div className="login-card" style={{ maxWidth: '560px', width: '92%', padding: '32px', textAlign: 'left', maxHeight: '92vh', overflowY: 'auto' }}>

            {/* Header del Onboarding */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#fff' }}>¡Bienvenido a Gourmet QR!</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>Configura tu restaurante antes de comenzar.</p>
              {/* Indicador de pasos */}
              {!showOnboardingSuccess && (
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '16px' }}>
                  {[1,2,3,4].map(s => (
                    <div key={s} style={{ width: '28px', height: '4px', borderRadius: '2px', background: onboardingStep >= s ? 'var(--accent)' : 'var(--border-color)', transition: 'background 0.3s' }} />
                  ))}
                </div>
              )}
            </div>

            {/* Pasos */}
            {!showOnboardingSuccess ? (
              <form onSubmit={handleOnboardingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* PASO 1: Contraseña */}
                {onboardingStep === 1 && (
                  <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--accent)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', margin: 0 }}>Paso 1 de 4 — Contraseña</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Crea una contraseña segura. Esta reemplaza la contraseña temporal que recibiste.</p>
                    <div className="form-group-admin" style={{ margin: 0 }}>
                      <label>Nueva Contraseña</label>
                      <input type="password" className="form-input-admin" placeholder="Mínimo 6 caracteres" value={onboardingPassword}
                        onChange={e => setOnboardingPassword(e.target.value)} required minLength={6} />
                    </div>
                    <button type="button" onClick={() => { if (onboardingPassword.length >= 6) setOnboardingStep(2); else alert('La contraseña debe tener al menos 6 caracteres.'); }} className="btn-admin-action" style={{ width: '100%' }}>
                      Continuar →
                    </button>
                  </div>
                )}

                {/* PASO 2: Datos del Negocio */}
                {onboardingStep === 2 && (
                  <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--accent)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', margin: 0 }}>Paso 2 de 4 — Datos del Negocio</h3>
                    <div className="form-group-admin" style={{ margin: 0 }}>
                      <label>Nombre del Restaurante</label>
                      <input type="text" className="form-input-admin" placeholder="Ej. Tacos El Rey" value={onboardingName}
                        onChange={e => { setOnboardingName(e.target.value); setOnboardingSlug(e.target.value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')); }} required />
                    </div>
                    <div className="form-group-admin" style={{ margin: 0 }}>
                      <label>Enlace Web (Slug)</label>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0 12px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)', userSelect: 'none', whiteSpace: 'nowrap' }}>{window.location.origin}/</span>
                        <input type="text" className="form-input-admin" style={{ border: 'none', background: 'transparent', width: '100%', paddingLeft: '4px' }}
                          placeholder="tacos-el-rey" value={onboardingSlug} onChange={e => setOnboardingSlug(e.target.value)} required />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Solo letras minúsculas, números y guiones.</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button type="button" onClick={() => setOnboardingStep(1)} className="btn-admin-secondary" style={{ width: '40%' }}>← Atrás</button>
                      <button type="button" onClick={() => { if (onboardingName && onboardingSlug) setOnboardingStep(3); else alert('Completa todos los campos.'); }} className="btn-admin-action" style={{ width: '60%' }}>Continuar →</button>
                    </div>
                  </div>
                )}

                {/* PASO 3: Identidad Visual */}
                {onboardingStep === 3 && (
                  <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--accent)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', margin: 0 }}>Paso 3 de 4 — Identidad Visual</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Personaliza el color de tu marca y sube el logo de tu negocio.</p>

                    {/* Color de acento */}
                    <div className="form-group-admin" style={{ margin: 0 }}>
                      <label>Color Principal de tu Marca</label>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <input type="color" value={onboardingAccentColor}
                          onChange={e => { setOnboardingAccentColor(e.target.value); document.documentElement.style.setProperty('--accent', e.target.value); }}
                          style={{ width: '52px', height: '44px', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }} />
                        <input type="text" className="form-input-admin" style={{ flex: 1 }}
                          value={onboardingAccentColor} onChange={e => { setOnboardingAccentColor(e.target.value); document.documentElement.style.setProperty('--accent', e.target.value); }}
                          placeholder="#ff5a1f" />
                      </div>
                    </div>

                    {/* Logo */}
                    <div className="form-group-admin" style={{ margin: 0 }}>
                      <label>Logo del Restaurante (Opcional)</label>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {onboardingLogoBase64 ? (
                          <img src={onboardingLogoBase64} alt="Logo preview" style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }} />
                        ) : (
                          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '20px', flexShrink: 0 }}>
                            {onboardingName ? onboardingName[0].toUpperCase() : 'G'}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                          <input type="file" accept="image/*" id="onboarding-logo-input" style={{ display: 'none' }}
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onloadend = () => setOnboardingLogoBase64(reader.result as string);
                              reader.readAsDataURL(file);
                            }} />
                          <label htmlFor="onboarding-logo-input" className="btn-admin-secondary" style={{ cursor: 'pointer', textAlign: 'center', padding: '8px 12px', fontSize: '13px' }}>
                            {onboardingLogoBase64 ? 'Cambiar Logo' : 'Subir Logo'}
                          </label>
                          {onboardingLogoBase64 && (
                            <button type="button" onClick={() => setOnboardingLogoBase64('')} className="btn-admin-secondary"
                              style={{ color: 'var(--danger)', fontSize: '12px', padding: '4px 8px' }}>Remover</button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                      <button type="button" onClick={() => setOnboardingStep(2)} className="btn-admin-secondary" style={{ width: '40%' }}>← Atrás</button>
                      <button type="button" onClick={() => setOnboardingStep(4)} className="btn-admin-action" style={{ width: '60%' }}>Continuar →</button>
                    </div>
                  </div>
                )}

                {/* PASO 4: Moneda y PIN de Cocina */}
                {onboardingStep === 4 && (
                  <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--accent)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', margin: 0 }}>Paso 4 de 4 — Moneda y Seguridad</h3>

                    <div className="form-group-admin" style={{ margin: 0 }}>
                      <label>Símbolo de Moneda</label>
                      <select className="form-input-admin"
                        style={{ width: '100%', background: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 16px', outline: 'none' }}
                        value={onboardingCurrency} onChange={e => setOnboardingCurrency(e.target.value)}>
                        {commonCurrencies.map((c, idx) => (
                          <option key={idx} value={c.symbol} style={{ background: 'var(--bg-primary)', color: '#fff' }}>{c.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group-admin" style={{ margin: 0 }}>
                      <label>PIN de Cocina (para que los cocineros accedan)</label>
                      <input type="text" className="form-input-admin" placeholder="Ej. 1234" maxLength={6}
                        value={onboardingKitchenPin} onChange={e => setOnboardingKitchenPin(e.target.value.replace(/\D/g, ''))} required />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Solo números, máximo 6 dígitos.</span>
                    </div>

                    {onboardingError && (
                      <div style={{ color: 'var(--danger)', fontSize: '13px', background: 'rgba(239,68,68,0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', textAlign: 'center' }}>
                        {onboardingError}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                      <button type="button" onClick={() => setOnboardingStep(3)} className="btn-admin-secondary" style={{ width: '40%' }}>← Atrás</button>
                      <button type="submit" className="btn-admin-action" style={{ width: '60%' }} disabled={onboardingSubmitting}>
                        {onboardingSubmitting ? 'Guardando...' : 'Finalizar Configuración'}
                      </button>
                    </div>
                  </div>
                )}
              </form>

            ) : (
              /* Pantalla de Éxito */
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', margin: 0 }}>¡Restaurante configurado!</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>Tu local ya está activo. Guarda estos enlaces:</p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '10px', border: '1px solid var(--sa-border)', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <strong style={{ color: 'var(--accent)', display: 'block', marginBottom: '4px' }}>Menú para Clientes:</strong>
                    <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{window.location.origin}/{savedSlug}/menu</span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--accent)', display: 'block', marginBottom: '4px' }}>Pantalla de Cocina:</strong>
                    <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{window.location.origin}/{savedSlug}/cocina</span>
                    <br />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PIN configurado: <strong>{onboardingKitchenPin}</strong></span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => { window.location.href = `/${savedSlug}/admin`; }}
                  className="btn-admin-action"
                  style={{ width: '100%', padding: '14px', fontSize: '15px' }}
                >
                  Ir al Panel de Administración ↗
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Barra superior en Móviles (Header con botón Hamburguesa) */}
      <header className="mobile-admin-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
              {settings.name ? settings.name[0] : 'G'}
            </div>
          )}
          <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)' }}>{settings.name}</span>
        </div>
        
        <button 
          className="hamburger-btn" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Menú"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {isMobileMenuOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {/* Overlay móvil para cerrar el menú haciendo clic afuera */}
      {isMobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      
      {/* Sidebar Lateral Izquierdo */}
      <aside className={`admin-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div className="sidebar-brand-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
            ) : (
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px' }}>
                {settings.name ? settings.name[0] : 'G'}
              </div>
            )}
            <div>
              <h2 className="admin-logo" style={{ fontSize: '18px', color: 'var(--text-primary)', margin: 0 }}>{settings.name}</h2>
              <span className="admin-badge" style={{ marginTop: '4px', display: 'inline-block' }}>Administrador</span>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => { setActiveTab('overview'); setIsMobileMenuOpen(false); }}
              className={`btn-admin-secondary ${activeTab === 'overview' ? 'active-tab' : ''}`}
              style={{
                width: '100%',
                textAlign: 'left',
                border: 'none',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'overview' ? 'var(--accent-light)' : 'transparent',
                color: activeTab === 'overview' ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'overview' ? '700' : '500',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer'
              }}
            >
              Resumen Operativo
            </button>

            <button
              onClick={() => { setActiveTab('menu'); setIsMobileMenuOpen(false); }}
              className={`btn-admin-secondary ${activeTab === 'menu' ? 'active-tab' : ''}`}
              style={{
                width: '100%',
                textAlign: 'left',
                border: 'none',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'menu' ? 'var(--accent-light)' : 'transparent',
                color: activeTab === 'menu' ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'menu' ? '700' : '500',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer'
              }}
            >
              Menú e Inventario
            </button>

            <button
              onClick={() => { setActiveTab('tables'); setIsMobileMenuOpen(false); }}
              className={`btn-admin-secondary ${activeTab === 'tables' ? 'active-tab' : ''}`}
              style={{
                width: '100%',
                textAlign: 'left',
                border: 'none',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'tables' ? 'var(--accent-light)' : 'transparent',
                color: activeTab === 'tables' ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'tables' ? '700' : '500',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer'
              }}
            >
              Mesas y QRs
            </button>

            <button
              onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
              className={`btn-admin-secondary ${activeTab === 'settings' ? 'active-tab' : ''}`}
              style={{
                width: '100%',
                textAlign: 'left',
                border: 'none',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'settings' ? 'var(--accent-light)' : 'transparent',
                color: activeTab === 'settings' ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'settings' ? '700' : '500',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer'
              }}
            >
              Ajustes de Marca
            </button>

            <button
              onClick={() => { setActiveTab('staff'); setIsMobileMenuOpen(false); }}
              className={`btn-admin-secondary ${activeTab === 'staff' ? 'active-tab' : ''}`}
              style={{
                width: '100%',
                textAlign: 'left',
                border: 'none',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'staff' ? 'var(--accent-light)' : 'transparent',
                color: activeTab === 'staff' ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'staff' ? '700' : '500',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer'
              }}
            >
              Gestionar Personal
            </button>
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="btn-admin-secondary"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          Cerrar Sesión
        </button>
      </aside>

      {/* Área de Contenido Principal */}
      <main className="admin-main">
        
        {/* PESTAÑA 1: Overview */}
        {activeTab === 'overview' && (
          <div className="admin-card animate-fade-in" style={{ gap: '28px' }}>
            <div className="card-header-admin">
              <h3 className="card-title-admin">Resumen del Día</h3>
            </div>
            
            <div className="kpi-grid">
              <div className="kpi-card" style={{ padding: '24px' }}>
                <span className="kpi-label">Ventas Hoy</span>
                <div className="kpi-value" style={{ fontSize: '32px' }}>{settings.currency}{Number(stats.totalSales || 0).toFixed(2)}</div>
              </div>
              <div className="kpi-card" style={{ padding: '24px' }}>
                <span className="kpi-label">Órdenes Recibidas</span>
                <div className="kpi-value" style={{ fontSize: '32px' }}>{stats.ordersCount}</div>
              </div>
              <div className="kpi-card" style={{ padding: '24px' }}>
                <span className="kpi-label">Mesas Activas</span>
                <div className="kpi-value" style={{ fontSize: '32px' }}>{stats.activeTablesCount}</div>
              </div>
              <div className="kpi-card" style={{ padding: '24px' }}>
                <span className="kpi-label">Demora Cocina</span>
                <div className="kpi-value" style={{ fontSize: '32px' }}>{stats.averageKitchenTime} min</div>
              </div>
            </div>

            <div className="admin-links-card" style={{ marginTop: '24px', background: 'rgba(255, 90, 31, 0.04)', border: '1px solid rgba(255, 90, 31, 0.15)', borderRadius: 'var(--radius-md)', padding: '24px', textAlign: 'left' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--accent)', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enlaces Rápidos de tu Negocio</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ fontSize: '13px', color: '#fff', display: 'block', marginBottom: '8px' }}>Carta Digital (Clientes)</strong>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      readOnly 
                      value={`${window.location.origin}/${restaurantSlug}/menu`} 
                      style={{ flexGrow: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 10px', fontSize: '12px', color: 'var(--text-secondary)', outline: 'none' }}
                    />
                    <button 
                      type="button" 
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/${restaurantSlug}/menu`); alert('Enlace copiado al portapapeles.'); }} 
                      className="btn-admin-secondary" 
                      style={{ padding: '8px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                    >
                      Copiar
                    </button>
                    <a 
                      href={`${window.location.origin}/${restaurantSlug}/menu`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="btn-admin-action" 
                      style={{ padding: '8px 12px', fontSize: '12px', textDecoration: 'none', textAlign: 'center' }}
                    >
                      Abrir ↗
                    </a>
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <strong style={{ fontSize: '13px', color: '#fff', display: 'block', marginBottom: '8px' }}>Pantalla de Cocina (Empleados)</strong>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      readOnly 
                      value={`${window.location.origin}/${restaurantSlug}/cocina`} 
                      style={{ flexGrow: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 10px', fontSize: '12px', color: 'var(--text-secondary)', outline: 'none' }}
                    />
                    <button 
                      type="button" 
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/${restaurantSlug}/cocina`); alert('Enlace copiado al portapapeles.'); }} 
                      className="btn-admin-secondary" 
                      style={{ padding: '8px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                    >
                      Copiar
                    </button>
                    <a 
                      href={`${window.location.origin}/${restaurantSlug}/cocina`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="btn-admin-action" 
                      style={{ padding: '8px 12px', fontSize: '12px', textDecoration: 'none', textAlign: 'center' }}
                    >
                      Abrir ↗
                    </a>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>PIN de ingreso configurado: <strong>{settings.kitchenPin}</strong></span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                El panel está escuchando la cocina. Las métricas se actualizan solas cada vez que se prepara o entrega un plato.
              </p>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: Menú e Inventario (Stock & Precios) */}
        {activeTab === 'menu' && (
          <div className="admin-card animate-fade-in" style={{ gap: '24px' }}>
            <div className="card-header-admin" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <h3 className="card-title-admin">Gestión de Menú e Inventario</h3>
              
              {/* Formulario rápido para nueva categoría */}
              <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Nueva categoría..."
                  className="form-input-admin"
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  required
                />
                <button type="submit" className="btn-admin-action" style={{ padding: '8px 14px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                  + Crear Categoría
                </button>
              </form>
            </div>

            {menu.map(cat => (
              <div key={cat.id} className="menu-category-group" style={{ marginTop: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h4 className="category-header-admin" style={{ margin: 0 }}>{cat.name}</h4>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setTargetCategoryId(cat.id);
                        setShowAddProductForm(true);
                      }}
                      className="btn-admin-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'var(--accent)', color: 'var(--accent)', background: 'transparent' }}
                    >
                      + Añadir Plato
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="btn-admin-secondary"
                      style={{ padding: '6px 8px', fontSize: '12px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                      title="Eliminar Categoría"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Formulario condicional para añadir producto en esta categoría */}
                {showAddProductForm && targetCategoryId === cat.id && (
                  <form onSubmit={handleAddProduct} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent)' }}>Añadir Plato a {cat.name}</h5>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                      <div className="form-group-admin" style={{ textAlign: 'left' }}>
                        <label style={{ fontSize: '12px' }}>Nombre del Plato *</label>
                        <input
                          type="text"
                          className="form-input-admin"
                          style={{ width: '100%', padding: '8px 12px' }}
                          placeholder="Ej. Tacos de Asada"
                          value={newProductName}
                          onChange={e => setNewProductName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group-admin" style={{ textAlign: 'left' }}>
                        <label style={{ fontSize: '12px' }}>Precio ({settings.currency}) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-input-admin"
                          style={{ width: '100%', padding: '8px 12px' }}
                          placeholder="0.00"
                          value={newProductPrice}
                          onChange={e => setNewProductPrice(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group-admin" style={{ textAlign: 'left' }}>
                      <label style={{ fontSize: '12px' }}>Descripción</label>
                      <textarea
                        className="form-input-admin"
                        style={{ width: '100%', padding: '8px 12px', minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }}
                        placeholder="Ingredientes o detalles del plato..."
                        value={newProductDesc}
                        onChange={e => setNewProductDesc(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'end' }}>
                      <div className="form-group-admin" style={{ textAlign: 'left' }}>
                        <label style={{ fontSize: '12px' }}>Etiquetas (Separadas por coma)</label>
                        <input
                          type="text"
                          className="form-input-admin"
                          style={{ width: '100%', padding: '8px 12px' }}
                          placeholder="Ej. Picante, Popular, Vegano"
                          value={newProductTags}
                          onChange={e => setNewProductTags(e.target.value)}
                        />
                      </div>
                      <div className="form-group-admin" style={{ textAlign: 'left' }}>
                        <label style={{ fontSize: '12px' }}>Imagen del Plato</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleProductFileChange}
                            style={{ display: 'none' }}
                            id="file-upload-input"
                          />
                          <label
                            htmlFor="file-upload-input"
                            className="btn-admin-secondary"
                            style={{ padding: '8px 12px', fontSize: '12px', cursor: 'pointer', display: 'inline-block', width: '100%', textAlign: 'center', whiteSpace: 'nowrap' }}
                          >
                            📷 {newProductImageBase64 ? 'Imagen lista' : 'Subir Imagen'}
                          </label>
                          {newProductImageBase64 && (
                            <button
                              type="button"
                              onClick={() => setNewProductImageBase64('')}
                              className="btn-admin-secondary"
                              style={{ color: 'var(--danger)', padding: '8px 10px', fontSize: '12px' }}
                              title="Remover imagen"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddProductForm(false);
                          setNewProductImageBase64('');
                        }}
                        className="btn-admin-secondary"
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="btn-admin-action"
                        style={{ padding: '8px 20px', fontSize: '13px' }}
                      >
                        Añadir Plato
                      </button>
                    </div>
                  </form>
                )}

                <div className="menu-list-admin" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {cat.products.map(product => (
                    <div key={product.id} className="menu-item-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {product.imageUrl && (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name} 
                            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                          />
                        )}
                        <div className="item-meta-admin">
                          <span className="item-name-admin" style={{ display: 'block', fontWeight: '600' }}>{product.name}</span>
                          <span className="item-price-admin-text" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Actual: {settings.currency}{Number(product.price).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="item-controls-admin" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* Editar Precio Rápido */}
                        <div className="price-input-wrapper">
                          <span className="price-input-symbol">{settings.currency}</span>
                          <input
                            type="number"
                            step="0.01"
                            className="price-input-field"
                            defaultValue={Number(product.price).toFixed(2)}
                            onBlur={(e) => handleSaveProductPrice(product.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                          />
                        </div>

                        {/* Switch de Stock (iOS Style) */}
                        <div className="switch-wrapper">
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={product.isActive}
                              onChange={() => handleToggleProductStock(product.id, product.isActive)}
                            />
                            <span className="slider"></span>
                          </label>
                          <span style={{ minWidth: '60px', opacity: product.isActive ? 1 : 0.4, fontSize: '13px' }}>
                            {product.isActive ? 'Disponible' : 'Agotado'}
                          </span>
                        </div>

                        {/* Eliminar Producto */}
                        <button
                          onClick={() => handleDeleteProduct(product.id, cat.id)}
                          className="btn-admin-secondary"
                          style={{ padding: '6px 8px', fontSize: '12px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                          title="Eliminar Plato"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                  {cat.products.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', padding: '10px 0' }}>
                      No hay platos en esta categoría todavía.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PESTAÑA 3: Mesas y QRs */}
        {activeTab === 'tables' && (
          <div className="admin-card animate-fade-in" style={{ maxWidth: '800px' }}>
            <div className="card-header-admin" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title-admin">Generar Códigos QR de Mesa</h3>
              {/* Selector de modo */}
              <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: 'var(--radius-sm)' }}>
                <button
                  onClick={() => setQrMode('individual')}
                  className={`btn-admin-secondary ${qrMode === 'individual' ? 'active-tab' : ''}`}
                  style={{ border: 'none', padding: '6px 12px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer', background: qrMode === 'individual' ? 'var(--accent-light)' : 'transparent', color: qrMode === 'individual' ? 'var(--accent)' : 'var(--text-secondary)' }}
                >
                  Individual
                </button>
                <button
                  onClick={() => setQrMode('batch')}
                  className={`btn-admin-secondary ${qrMode === 'batch' ? 'active-tab' : ''}`}
                  style={{ border: 'none', padding: '6px 12px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer', background: qrMode === 'batch' ? 'var(--accent-light)' : 'transparent', color: qrMode === 'batch' ? 'var(--accent)' : 'var(--text-secondary)' }}
                >
                  Por Lote (Varios)
                </button>
              </div>
            </div>
            
            <div className="qr-generator-section">
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'left', marginBottom: '16px' }}>
                Cada mesa necesita un código QR único pegado físicamente. Elige el modo para generar códigos únicos o un lote completo para imprimir de una sola vez.
              </p>

              {qrMode === 'individual' ? (
                /* Modo Individual */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group-admin" style={{ textAlign: 'left' }}>
                    <label>Número de Mesa</label>
                    <input
                      type="number"
                      className="form-input-admin"
                      min="1"
                      value={mesaInput}
                      onChange={e => setMesaInput(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>


                  {generatedQrUrl && (
                    <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                      {/* Tarjeta de impresión física (90x130 mm) */}
                      <div id="qr-card-individual" style={{ 
                        background: '#ffffff', 
                        padding: '20px', 
                        borderRadius: '8px', 
                        border: '1px solid #e2e8f0',
                        width: '90mm',
                        height: '130mm',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0f172a',
                        textAlign: 'center',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', marginBottom: '4px' }}>
                          {settings.name}
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
                          MESA {mesaInput}
                        </div>
                        <div style={{ padding: '8px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #f1f5f9', display: 'inline-block', marginBottom: '10px' }}>
                          <img src={generatedQrUrl} alt={`QR Mesa ${mesaInput}`} style={{ width: '150px', height: '150px', display: 'block' }} />
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          Escanea para ordenar
                        </div>
                      </div>
                      
                      <button 
                        onClick={downloadIndividualQrPdf} 
                        className="btn-admin-action" 
                        disabled={loadingPdf}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        {loadingPdf ? 'Generando PDF...' : '📥 Descargar PDF'}
                      </button>

                      <a
                        href={generatedQrUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-admin-secondary"
                        style={{ display: 'block', textDecoration: 'none', textAlign: 'center', width: '100%', padding: '12px' }}
                      >
                        Ver Imagen en Alta Resolución ↗
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                /* Modo Lote */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group-admin" style={{ textAlign: 'left' }}>
                      <label>Mesa Inicial</label>
                      <input
                        type="number"
                        className="form-input-admin"
                        min="1"
                        value={rangeStart}
                        onChange={e => setRangeStart(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div className="form-group-admin" style={{ textAlign: 'left' }}>
                      <label>Mesa Final</label>
                      <input
                        type="number"
                        className="form-input-admin"
                        min="1"
                        value={rangeEnd}
                        onChange={e => setRangeEnd(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>


                  {bulkQrs.length > 0 && (
                    <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '700' }}>QRs Generados ({bulkQrs.length})</h4>
                        
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={downloadBulkQrPdf}
                            className="btn-admin-action"
                            disabled={loadingPdf}
                            style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            {loadingPdf ? 'Generando...' : '📥 Descargar PDF'}
                          </button>

                        </div>
                      </div>

                      {/* Cuadrícula de Impresión de QRs */}
                      <div id="qr-cards-batch" className="qr-print-grid">
                        {bulkQrs.map((item, idx) => (
                          <div key={idx} className="qr-print-card">
                            <div className="qr-print-header">{settings.name}</div>
                            <div className="qr-print-mesa">MESA {item.mesa}</div>
                            <div className="qr-print-image-box">
                              <img src={item.qrUrl} alt={`QR Mesa ${item.mesa}`} style={{ width: '150px', height: '150px' }} />
                            </div>
                            <div className="qr-print-footer">Escanea para ordenar</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA 4: Ajustes de Marca */}
        {activeTab === 'settings' && (
          <div className="admin-card animate-fade-in" style={{ maxWidth: '600px' }}>
            <div className="card-header-admin">
              <h3 className="card-title-admin">Identidad y Seguridad del Local</h3>
            </div>

            <form onSubmit={handleSaveSettings} className="settings-form">
              <div className="form-group-admin">
                <label>Nombre del Restaurante</label>
                <input
                  type="text"
                  className="form-input-admin"
                  value={settings.name}
                  onChange={e => setSettings({ ...settings, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group-admin">
                <label>Logo del Restaurante</label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  {settings.logoUrl || logoBase64 ? (
                    <img 
                      src={logoBase64 || settings.logoUrl || ''} 
                      alt="Logo Preview" 
                      style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} 
                    />
                  ) : (
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '24px' }}>
                      {settings.name ? settings.name[0] : 'G'}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      style={{ display: 'none' }}
                      id="logo-upload-input"
                    />
                    <label
                      htmlFor="logo-upload-input"
                      className="btn-admin-secondary"
                      style={{ padding: '8px 14px', fontSize: '13px', cursor: 'pointer' }}
                    >
                      📷 Subir Logo
                    </label>
                    {(settings.logoUrl || logoBase64) && (
                      <button
                        type="button"
                        onClick={() => {
                          setLogoBase64('');
                          setSettings({ ...settings, logoUrl: null });
                        }}
                        className="btn-admin-secondary"
                        style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)', padding: '8px 12px' }}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-group-admin">
                <label>Color de Acento de la Marca</label>
                <div className="color-picker-row">
                  <input
                    type="color"
                    className="color-input-picker"
                    value={settings.accentColor}
                    onChange={e => setSettings({ ...settings, accentColor: e.target.value })}
                  />
                  <input
                    type="text"
                    className="form-input-admin"
                    style={{ flexGrow: 1, fontFamily: 'monospace' }}
                    value={settings.accentColor.toUpperCase()}
                    onChange={e => setSettings({ ...settings, accentColor: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group-admin">
                <label>Símbolo Monetario</label>
                <select
                  className="form-input-admin"
                  style={{ width: '100%', background: 'rgba(0, 0, 0, 0.2)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 16px', outline: 'none' }}
                  value={selectedCurrencyOption}
                  onChange={e => {
                    const val = e.target.value;
                    setSelectedCurrencyOption(val);
                    if (val !== 'custom') {
                      setSettings({ ...settings, currency: val });
                    } else {
                      setSettings({ ...settings, currency: customCurrencySymbol });
                    }
                  }}
                >
                  {commonCurrencies.map((c, idx) => (
                    <option key={idx} value={c.symbol} style={{ background: 'var(--bg-primary)', color: '#fff' }}>
                      {c.label}
                    </option>
                  ))}
                  <option value="custom" style={{ background: 'var(--bg-primary)', color: '#fff' }}>Personalizado...</option>
                </select>

                {selectedCurrencyOption === 'custom' && (
                  <input
                    type="text"
                    className="form-input-admin"
                    style={{ width: '100%', marginTop: '10px' }}
                    placeholder="Escribe el símbolo (ej. kr)"
                    maxLength={5}
                    value={customCurrencySymbol}
                    onChange={e => {
                      const val = e.target.value;
                      setCustomCurrencySymbol(val);
                      setSettings({ ...settings, currency: val });
                    }}
                    required
                  />
                )}
              </div>

              <div className="form-group-admin">
                <label>PIN de Cocina (Para la tablet de los cocineros)</label>
                <input
                  type="text"
                  className="form-input-admin"
                  maxLength={4}
                  value={settings.kitchenPin}
                  onChange={e => setSettings({ ...settings, kitchenPin: e.target.value.replace(/\D/g, '') })}
                  required
                />
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', margin: '12px 0' }}></div>

              <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Credenciales del Dueño
              </h4>

              <div className="form-group-admin">
                <label>Correo Electrónico de Administrador</label>
                <input
                  type="email"
                  className="form-input-admin"
                  value={settings.adminEmail}
                  onChange={e => setSettings({ ...settings, adminEmail: e.target.value })}
                  required
                />
              </div>

              <div className="form-group-admin">
                <label>Nueva Contraseña (Dejar en blanco para no cambiar)</label>
                <input
                  type="password"
                  className="form-input-admin"
                  placeholder="Escribe la nueva contraseña"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-admin-action" style={{ marginTop: '10px' }}>
                Guardar Cambios de Ajustes
              </button>
            </form>
          </div>
        )}

        {/* PESTAÑA 5: Gestionar Personal */}
        {activeTab === 'staff' && (
          <StaffTab token={token} restaurantSlug={restaurantSlug} apiBase={apiBase} />
        )}

      </main>

    </div>
  );
}
