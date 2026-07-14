import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import './Cocina.css';

// Interfaces
interface Product {
  name: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  specialNotes: string | null;
  unitPrice: number;
  options: {
    name: string;
    value: string;
  }[];
  product: Product;
}

interface Order {
  id: string;
  tableNumber: string;
  status: string; // pending, preparing, ready, delivered
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

interface ServiceRequest {
  id: string;
  restaurantSlug: string;
  tableNumber: string;
  type: 'waiter' | 'bill';
  createdAt: string;
}

// Componente para calcular el tiempo transcurrido en tiempo real
const TimeElapsed: React.FC<{ createdAt: string }> = ({ createdAt }) => {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const calculateTime = () => {
      const createdTime = new Date(createdAt).getTime();
      const now = new Date().getTime();
      const diffMs = now - createdTime;

      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);

      if (diffMins === 0) {
        setElapsed(`${diffSecs} seg`);
      } else {
        const remainingSecs = diffSecs % 60;
        setElapsed(`${diffMins} min ${remainingSecs} seg`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  return <span>⏱️ {elapsed}</span>;
};

export const Cocina: React.FC = () => {
  const { restaurantSlug: urlSlug } = useParams<{ restaurantSlug: string }>();
  const restaurantSlug = urlSlug || 'gourmet-qr';
  const { socket, isConnected } = useSocket();
  const [orders, setOrders] = useState<Order[]>([]);
  const [newOrderIds, setNewOrderIds] = useState<string[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [recentDeliveries, setRecentDeliveries] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem(`gourmetqr_recent_deliveries_${restaurantSlug}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [deliverySelectorOrderId, setDeliverySelectorOrderId] = useState<string | null>(null);

  // Helper para forzar HTTPS en URLs de imágenes (evita Mixed Content en Vercel)
  const ensureHttps = (url: string | null): string => {
    if (!url) return '';
    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
    return url;
  };

  // Guardar historial de entregados cuando cambie
  useEffect(() => {
    localStorage.setItem(`gourmetqr_recent_deliveries_${restaurantSlug}`, JSON.stringify(recentDeliveries));
  }, [recentDeliveries, restaurantSlug]);

  // Estados de Autenticación por PIN y Marca
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [correctPin, setCorrectPin] = useState('1234'); // Fallback por defecto
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Cargar PIN y Logo desde settings del restaurante
  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    fetch(`${apiBase}/api/${restaurantSlug}/settings`)
      .then(res => res.json())
      .then(data => {
        if (data.kitchenPin) {
          setCorrectPin(data.kitchenPin);
          const savedAuth = localStorage.getItem(`gourmetqr_kitchen_auth_${restaurantSlug}`);
          const savedPin = localStorage.getItem(`gourmetqr_kitchen_pin_${restaurantSlug}`);
          if (savedAuth === 'true' && savedPin === data.kitchenPin) {
            setIsAuthenticated(true);
          }
        }
        if (data.logoUrl) {
          setLogoUrl(data.logoUrl);
        }
      })
      .catch(err => console.error('Error al obtener ajustes de cocina:', err));
  }, []);

  const handlePinKeyPress = (digit: string) => {
    setPinError(false);
    if (pinInput.length < 4) {
      const newPin = pinInput + digit;
      setPinInput(newPin);
      
      // Auto-validar al llegar a 4 dígitos
      if (newPin.length === 4) {
        if (newPin === correctPin) {
          setIsAuthenticated(true);
          localStorage.setItem(`gourmetqr_kitchen_auth_${restaurantSlug}`, 'true');
          localStorage.setItem(`gourmetqr_kitchen_pin_${restaurantSlug}`, correctPin);
        } else {
          setPinError(true);
          // Resetear tras pequeña pausa para que el usuario note el error
          setTimeout(() => {
            setPinInput('');
          }, 600);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  const handleResolveService = (requestId: string) => {
    if (!socket) return;
    socket.emit('resolve_service', { id: requestId, restaurantSlug });
    setServiceRequests(prev => prev.filter(r => r.id !== requestId));
  };

  // Web Audio API: Sonido sutil de campana programático
  const playAlertSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const audioCtx = new AudioContextClass();
      
      // Primer tono (agudo)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5 note
      gain1.gain.setValueAtTime(0, audioCtx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.8);

      // Segundo tono armonioso con delay
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.12); // A5 note
      gain2.gain.setValueAtTime(0, audioCtx.currentTime + 0.12);
      gain2.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.17);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.0);
      osc2.start(audioCtx.currentTime + 0.12);
      osc2.stop(audioCtx.currentTime + 1.0);

    } catch (e) {
      console.warn('El navegador bloqueó la reproducción automática del audio inicial.', e);
    }
  };

  // Cargar órdenes iniciales y entregas recientes
  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    // Cargar órdenes activas
    fetch(`${apiBase}/api/${restaurantSlug}/orders`)
      .then(res => res.json())
      .then((data: Order[]) => {
        setOrders(data);
      })
      .catch(err => {
        console.error('Error al cargar órdenes:', err);
      });

    // Cargar entregas recientes
    fetch(`${apiBase}/api/${restaurantSlug}/orders/recent`)
      .then(res => res.json())
      .then((data: Order[]) => {
        setRecentDeliveries(data);
      })
      .catch(err => {
        console.error('Error al cargar entregas recientes:', err);
      });
  }, []);

  // Escuchar eventos en tiempo real
  useEffect(() => {
    if (!socket) return;

    // Nueva orden recibida
    const handleNewOrder = (order: Order) => {
      setOrders(prev => [...prev, order]);
      setNewOrderIds(prev => [...prev, order.id]);
      
      // Reproducir sonido
      playAlertSound();

      // Quitar el parpadeo automáticamente después de 10 segundos
      setTimeout(() => {
        setNewOrderIds(prev => prev.filter(id => id !== order.id));
      }, 10000);
    };

    // Orden actualizada por otro proceso
    const handleOrderUpdated = (updatedOrder: Order) => {
      if (updatedOrder.status === 'delivered') {
        // Remover de la lista activa
        setOrders(prev => prev.filter(o => o.id !== updatedOrder.id));
        // Agregar al historial de entregas recientes si no está
        setRecentDeliveries(prev => {
          if (prev.some(o => o.id === updatedOrder.id)) return prev;
          return [updatedOrder, ...prev].slice(0, 5);
        });
      } else {
        // Actualizar estado en la lista
        setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
      }
    };

    const handleSettingsUpdated = (data: any) => {
      if (data.settings) {
        if (data.settings.kitchenPin) setCorrectPin(data.settings.kitchenPin);
        if (data.settings.logoUrl) setLogoUrl(data.settings.logoUrl);
      }
    };

    const handleNewServiceRequest = (req: ServiceRequest) => {
      if (req.restaurantSlug === restaurantSlug) {
        setServiceRequests(prev => {
          // Evitar duplicados si llega dos veces
          if (prev.some(r => r.id === req.id)) return prev;
          return [...prev, req];
        });
        playAlertSound();
      }
    };

    const handleServiceResolved = (data: { id: string; restaurantSlug: string }) => {
      if (data.restaurantSlug === restaurantSlug) {
        setServiceRequests(prev => prev.filter(r => r.id !== data.id));
      }
    };

    socket.on('new_order', handleNewOrder);
    socket.on('order_updated', handleOrderUpdated);
    socket.on('settings_updated', handleSettingsUpdated);
    socket.on('new_service_request', handleNewServiceRequest);
    socket.on('service_resolved', handleServiceResolved);

    return () => {
      socket.off('new_order', handleNewOrder);
      socket.off('order_updated', handleOrderUpdated);
      socket.off('settings_updated', handleSettingsUpdated);
      socket.off('new_service_request', handleNewServiceRequest);
      socket.off('service_resolved', handleServiceResolved);
    };
  }, [socket]);

  // Avanzar estado de la orden
  const handleAdvanceStatus = (orderId: string, currentStatus: string) => {
    let nextStatus = '';
    if (currentStatus === 'pending') nextStatus = 'preparing';
    else if (currentStatus === 'preparing') nextStatus = 'ready';
    else if (currentStatus === 'ready') nextStatus = 'delivered';

    // Remover parpadeo si el usuario interactúa con la tarjeta
    setNewOrderIds(prev => prev.filter(id => id !== orderId));

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    fetch(`${apiBase}/api/${restaurantSlug}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: nextStatus })
    })
      .then(res => res.json())
      .then((updatedOrder: Order) => {
        if (nextStatus === 'delivered') {
          // Guardar la orden antes de removerla para el historial y poder deshacer
          const orderToDeliver = orders.find(o => o.id === orderId);
          if (orderToDeliver) {
            setRecentDeliveries(prev => [orderToDeliver, ...prev].slice(0, 5));
          }
          setOrders(prev => prev.filter(o => o.id !== orderId));
        } else {
          setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
        }
      })
      .catch(err => {
        console.error('Error al avanzar el estado de la orden:', err);
      });
  };

  // Deshacer entrega y regresar pedido a la cocina
  const handleUndoDelivery = (orderId: string) => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    fetch(`${apiBase}/api/${restaurantSlug}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'ready' })
    })
      .then(res => res.json())
      .then((restoredOrder: Order) => {
        setOrders(prev => [...prev, restoredOrder]);
        setRecentDeliveries(prev => prev.filter(o => o.id !== orderId));
      })
      .catch(err => {
        console.error('Error al deshacer la entrega de la orden:', err);
      });
  };

  // Filtrar órdenes por columnas
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');

  if (!isAuthenticated) {
    return (
      <div className="kitchen-pin-overlay">
        <div className="kitchen-pin-card">
          <h2 className="kitchen-pin-title">Control de Cocina</h2>
          <p className="kitchen-pin-subtitle">Ingresa el PIN de 4 dígitos para acceder</p>
          
          <div className={`kitchen-pin-dots-row ${pinError ? 'shake-error' : ''}`}>
            {[0, 1, 2, 3].map((index) => (
              <span 
                key={index} 
                className={`pin-dot ${pinInput.length > index ? 'filled' : ''}`}
              ></span>
            ))}
          </div>

          {pinError && (
            <p className="pin-error-text">⚠️ PIN Incorrecto. Intenta de nuevo.</p>
          )}

          <div className="kitchen-keypad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button 
                key={digit} 
                className="keypad-btn" 
                onClick={() => handlePinKeyPress(digit)}
              >
                {digit}
              </button>
            ))}
            <button className="keypad-btn backspace-btn" onClick={handleBackspace}>
              ⌫
            </button>
            <button className="keypad-btn" onClick={() => handlePinKeyPress('0')}>
              0
            </button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
              PIN
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cocina-container">
      {/* Header */}
      <header className="cocina-header glass">
        <div className="cocina-header-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {logoUrl && (
            <img 
              src={ensureHttps(logoUrl)} 
              alt="Logo" 
              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} 
            />
          )}
          <div className="cocina-logo" style={{ fontSize: '20px' }}>
            Gourmet Cocina
          </div>
        </div>
        <div className={`status-badge-connection ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="pulse-dot"></span>
          {isConnected ? 'En Línea' : 'Desconectado'}
        </div>
      </header>

      {/* Tablero Kanban */}
      <main className="kanban-board">

        {/* Columna: Llamados de Mesa */}
        <section className="kanban-column service-calls-column">
          <header className="column-header" style={{ background: 'rgba(255, 90, 31, 0.08)', borderBottom: '1px solid rgba(255, 90, 31, 0.15)' }}>
            <div className="column-title-group">
              <span className="column-dot pending" style={{ background: 'var(--accent)' }}></span>
              <h3 className="column-title" style={{ color: 'var(--accent)' }}>Llamados de Mesa</h3>
            </div>
            <span className="column-count-badge" style={{ background: 'var(--accent)' }}>{serviceRequests.length}</span>
          </header>

          <div className="column-cards-container">
            {serviceRequests.map(req => (
              <div 
                key={req.id} 
                className="order-card service-call-card animate-scale-up" 
                style={{ borderColor: req.type === 'bill' ? '#10b981' : 'var(--accent)', background: 'rgba(22, 26, 34, 0.95)', padding: '16px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div className="order-card-table" style={{ margin: 0, padding: '4px 10px', fontSize: '12px', background: req.type === 'bill' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(240, 106, 56, 0.15)', color: req.type === 'bill' ? '#10b981' : 'var(--accent)' }}>
                    MESA {req.tableNumber}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <TimeElapsed createdAt={req.createdAt} />
                  </div>
                </div>

                <div style={{ fontSize: '15px', fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  {req.type === 'bill' ? (
                    <>
                      <span style={{ fontSize: '18px' }}>💵</span>
                      <span>Solicita la Cuenta</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '18px' }}>🙋‍♂️</span>
                      <span>Llama al Mesero</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleResolveService(req.id)}
                  className="kanban-action-btn"
                  style={{ width: '100%', background: req.type === 'bill' ? '#10b981' : 'var(--accent)', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Marcar Atendido ✓
                </button>
              </div>
            ))}
            {serviceRequests.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', padding: '20px 0', textAlign: 'center' }}>
                Sin llamados pendientes.
              </div>
            )}
          </div>
        </section>
        
        {/* Columna: Pendientes */}
        <section className="kanban-column">
          <header className="column-header">
            <div className="column-title-group">
              <span className="column-dot pending"></span>
              <h3 className="column-title">Pendientes</h3>
            </div>
            <span className="column-count-badge">{pendingOrders.length}</span>
          </header>
          
          <div className="column-cards-container">
            {pendingOrders.map(order => (
              <div 
                key={order.id} 
                className={`order-card ${newOrderIds.includes(order.id) ? 'is-new' : ''}`}
              >
                <div className="order-card-header">
                  <div className="order-card-table">MESA {order.tableNumber}</div>
                  <div className="order-card-time">
                    <TimeElapsed createdAt={order.createdAt} />
                  </div>
                </div>

                <div className="order-card-items">
                  {order.items.map(item => (
                    <div key={item.id} className="order-card-item">
                      <div className="item-main-row">
                        <span>
                          <span className="item-qty">{item.quantity}x</span> 
                          {item.product.name}
                        </span>
                      </div>
                      
                      {item.options && item.options.length > 0 && (
                        <div className="item-options-list">
                          {item.options.map((opt: any, oIdx: number) => (
                            <div key={oIdx}>• {opt.name}: {opt.value}</div>
                          ))}
                        </div>
                      )}

                      {item.specialNotes && (
                        <div className="item-special-notes">
                          NOTA: {item.specialNotes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="order-card-footer">
                  <div className="order-card-total">
                    Total: <span>${Number(order.totalAmount).toFixed(2)}</span>
                  </div>
                  <button 
                    className="kanban-action-btn start-prep"
                    onClick={() => handleAdvanceStatus(order.id, order.status)}
                  >
                    Aceptar y Preparar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Columna: En Preparación */}
        <section className="kanban-column">
          <header className="column-header">
            <div className="column-title-group">
              <span className="column-dot preparing"></span>
              <h3 className="column-title">En Preparación</h3>
            </div>
            <span className="column-count-badge">{preparingOrders.length}</span>
          </header>

          <div className="column-cards-container">
            {preparingOrders.map(order => (
              <div key={order.id} className="order-card">
                <div className="order-card-header">
                  <div className="order-card-table">MESA {order.tableNumber}</div>
                  <div className="order-card-time">
                    <TimeElapsed createdAt={order.createdAt} />
                  </div>
                </div>

                <div className="order-card-items">
                  {order.items.map(item => (
                    <div key={item.id} className="order-card-item">
                      <div className="item-main-row">
                        <span>
                          <span className="item-qty">{item.quantity}x</span> 
                          {item.product.name}
                        </span>
                      </div>
                      
                      {item.options && item.options.length > 0 && (
                        <div className="item-options-list">
                          {item.options.map((opt: any, oIdx: number) => (
                            <div key={oIdx}>• {opt.name}: {opt.value}</div>
                          ))}
                        </div>
                      )}

                      {item.specialNotes && (
                        <div className="item-special-notes">
                          NOTA: {item.specialNotes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="order-card-footer" style={{ flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div className="order-card-total">
                      Total: <span>${Number(order.totalAmount).toFixed(2)}</span>
                    </div>
                  </div>
                  {deliverySelectorOrderId === order.id ? (
                    <div className="animate-scale-up" style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'center', fontWeight: 'bold' }}>¿CÓMO SE ENTREGARÁ EL PEDIDO?</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <button
                          type="button"
                          className="kanban-action-btn"
                          style={{ background: 'var(--accent)', color: '#fff', fontSize: '10px', padding: '8px 2px' }}
                          onClick={() => {
                            // Mover a la columna 3 (Listos para Entregar) en espera de mesero
                            setDeliverySelectorOrderId(null);
                            handleAdvanceStatus(order.id, order.status);
                          }}
                        >
                          🛎️ Lleva Mesero
                        </button>
                        <button
                          type="button"
                          className="kanban-action-btn"
                          style={{ background: '#3b82f6', color: '#fff', fontSize: '10px', padding: '8px 2px' }}
                          onClick={() => {
                            // Despachar inmediatamente para Auto-Servicio/Barra
                            setDeliverySelectorOrderId(null);
                            if (socket) {
                              socket.emit('order_ready_to_collect', { orderId: order.id, restaurantSlug });
                            }
                            // Avanzamos directo a entregado (delivered) para no dejarlo en columna 3
                            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
                            fetch(`${apiBase}/api/${restaurantSlug}/orders/${order.id}/status`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'delivered' })
                            })
                              .then(res => res.json())
                              .then(() => {
                                setRecentDeliveries(prev => [order, ...prev].slice(0, 5));
                                setOrders(prev => prev.filter(o => o.id !== order.id));
                              })
                              .catch(err => console.error('Error al auto-entregar barra:', err));
                          }}
                        >
                          📢 Retira en Barra
                        </button>
                      </div>
                      <button
                        type="button"
                        className="btn-admin-secondary"
                        style={{ fontSize: '10px', padding: '4px' }}
                        onClick={() => setDeliverySelectorOrderId(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="kanban-action-btn ready-prep"
                      onClick={() => setDeliverySelectorOrderId(order.id)}
                    >
                      Listo ✔
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Columna: Listos */}
        <section className="kanban-column">
          <header className="column-header">
            <div className="column-title-group">
              <span className="column-dot ready"></span>
              <h3 className="column-title">Listo para Entregar</h3>
            </div>
            <span className="column-count-badge">{readyOrders.length}</span>
          </header>

          <div className="column-cards-container">
            {readyOrders.map(order => (
              <div key={order.id} className="order-card" style={{ borderColor: '#f59e0b', background: 'rgba(245, 158, 11, 0.03)' }}>
                <div className="order-card-header">
                  <div className="order-card-table" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>MESA {order.tableNumber}</div>
                  <div className="order-card-time">
                    <TimeElapsed createdAt={order.createdAt} />
                  </div>
                </div>

                <div className="order-card-items">
                  {order.items.map(item => (
                    <div key={item.id} className="order-card-item">
                      <div className="item-main-row">
                        <span>
                          <span className="item-qty">{item.quantity}x</span> 
                          {item.product.name}
                        </span>
                      </div>
                      
                      {item.options && item.options.length > 0 && (
                        <div className="item-options-list">
                          {item.options.map((opt: any, oIdx: number) => (
                            <div key={oIdx}>• {opt.name}: {opt.value}</div>
                          ))}
                        </div>
                      )}

                      {item.specialNotes && (
                        <div className="item-special-notes">
                          NOTA: {item.specialNotes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="order-card-footer" style={{ flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div className="order-card-total">
                      Total: <span>${Number(order.totalAmount).toFixed(2)}</span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#f59e0b', animation: 'pulse 1.5s infinite' }}>⚠️ Esperando Mesero</span>
                  </div>
                  <button 
                    className="kanban-action-btn"
                    style={{ background: '#f59e0b', color: '#fff', fontSize: '12px', padding: '10px 4px', width: '100%' }}
                    onClick={() => handleAdvanceStatus(order.id, order.status)}
                  >
                    ✓ Entregado a Mesa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* HISTORIAL LATERAL DE ENTREGADOS RECIENTES */}
        {recentDeliveries.length > 0 && (
          <section className="kanban-column" style={{ maxWidth: '280px', borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>
            <header className="column-header">
              <h3 className="column-title" style={{ color: 'var(--text-secondary)' }}>Entregas Recientes</h3>
            </header>
            <div className="column-cards-container" style={{ gap: '10px' }}>
              {recentDeliveries.map(order => (
                <div key={order.id} className="order-card" style={{ opacity: 0.7, padding: '12px', borderColor: 'var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <strong style={{ color: '#fff' }}>MESA {order.tableNumber}</strong>
                    <span style={{ color: 'var(--text-muted)' }}>${Number(order.totalAmount).toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {order.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ')}
                  </div>
                  <button
                    type="button"
                    className="kanban-action-btn"
                    style={{ width: '100%', padding: '6px', fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                    onClick={() => handleUndoDelivery(order.id)}
                  >
                    ↩ Deshacer Entrega
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  );
};
