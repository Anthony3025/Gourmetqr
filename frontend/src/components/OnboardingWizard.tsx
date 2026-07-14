import React, { useState } from 'react';

interface Settings {
  name: string;
  logoUrl?: string | null;
  accentColor: string;
  currency: string;
  kitchenPin: string;
  adminEmail: string;
}

interface OnboardingWizardProps {
  settings: Settings;
  restaurantSlug: string;
  token: string;
  apiBase: string;
}

const commonCurrencies = [
  { label: 'Dólar Estadounidense ($)', symbol: '$' },
  { label: 'Euro (€)', symbol: '€' },
  { label: 'Peso Mexicano ($)', symbol: '$' },
  { label: 'Peso Colombiano ($)', symbol: '$' },
  { label: 'Peso Chileno ($)', symbol: '$' },
  { label: 'Peso Argentino ($)', symbol: '$' },
  { label: 'Sol Peruano (S/.)', symbol: 'S/.' },
  { label: 'Boliviano (Bs.)', symbol: 'Bs.' },
  { label: 'Guaraní (₲)', symbol: '₲' },
  { label: 'Colón Costarricense (₡)', symbol: '₡' }
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  settings,
  restaurantSlug,
  token,
  apiBase
}) => {
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingSlug, setOnboardingSlug] = useState('');
  const [onboardingPassword, setOnboardingPassword] = useState('');
  const [onboardingCurrencyOption, setOnboardingCurrencyOption] = useState('$');
  const [onboardingCustomCurrency, setOnboardingCustomCurrency] = useState('');
  const [onboardingAccentColor, setOnboardingAccentColor] = useState('#ff5a1f');
  const [onboardingKitchenPin, setOnboardingKitchenPin] = useState('');
  const [onboardingLogoBase64, setOnboardingLogoBase64] = useState('');
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingError, setOnboardingError] = useState('');
  const [onboardingSubmitting, setOnboardingSubmitting] = useState(false);
  const [showOnboardingSuccess, setShowOnboardingSuccess] = useState(false);
  const [savedSlug, setSavedSlug] = useState('');

  if (settings.name !== "Nombre Temporal") {
    return null;
  }

  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingError('');
    setOnboardingSubmitting(true);

    const slugToSave = onboardingSlug.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
    const finalCurrency = onboardingCurrencyOption === 'custom' ? onboardingCustomCurrency : onboardingCurrencyOption;

    fetch(`${apiBase}/api/${restaurantSlug}/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || localStorage.getItem('admin_token')}`
      },
      body: JSON.stringify({
        name: onboardingName,
        slug: slugToSave,
        currency: finalCurrency,
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

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0,
      width: '100%', height: '100%',
      zIndex: 9999,
      background: 'radial-gradient(circle at top right, #1e1e38, #0b0f19 80%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      overflowY: 'auto'
    }}>
      <div className="login-card" style={{ maxWidth: '560px', width: '100%', padding: '32px', textAlign: 'left', maxHeight: '92vh', overflowY: 'auto' }}>

        {/* Header del Onboarding */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#fff' }}>¡Bienvenido a Gourmet QR!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>Configura tu restaurante antes de comenzar.</p>
          {/* Indicador de pasos */}
          {!showOnboardingSuccess && (
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '16px' }}>
              {[1, 2, 3, 4].map(s => (
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
                          style={{ color: 'var(--danger)', fontSize: '13px', padding: '6px 12px' }} title="Remover Logo">🗑️</button>
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
                    value={onboardingCurrencyOption} onChange={e => setOnboardingCurrencyOption(e.target.value)}>
                    {commonCurrencies.map((c, idx) => (
                      <option key={idx} value={c.symbol} style={{ background: 'var(--bg-primary)', color: '#fff' }}>{c.label}</option>
                    ))}
                    <option value="custom" style={{ background: 'var(--bg-primary)', color: '#fff' }}>Personalizado...</option>
                  </select>

                  {onboardingCurrencyOption === 'custom' && (
                    <input
                      type="text"
                      className="form-input-admin"
                      style={{ width: '100%', marginTop: '10px' }}
                      placeholder="Escribe el símbolo (ej. kr)"
                      maxLength={5}
                      value={onboardingCustomCurrency}
                      onChange={e => setOnboardingCustomCurrency(e.target.value)}
                      required
                    />
                  )}
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
  );
};
