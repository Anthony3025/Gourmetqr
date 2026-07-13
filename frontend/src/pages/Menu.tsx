import React, { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import './Menu.css';

// Interfaces
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  tags: string[]; // Ej. ["Vegano", "Sin Gluten", "Picante", "Popular"]
  categoryId: string;
  isActive: boolean;
}

interface Category {
  id: string;
  name: string;
  displayOrder: number;
  products: Product[];
}

interface CartItem {
  cartId: string; // Identificador único en el carrito
  product: Product;
  quantity: number;
  specialNotes: string;
  selectedOptions: {
    name: string;
    value: string;
    extraPrice: number;
  }[];
  totalPrice: number;
}

interface Order {
  id: string;
  tableNumber: string;
  status: string; // pending, preparing, ready, delivered
  totalAmount: number;
  items: any[];
}

export const Menu: React.FC = () => {
  const { restaurantSlug: urlSlug } = useParams<{ restaurantSlug: string }>();
  const [searchParams] = useSearchParams();
  const restaurantSlug = urlSlug || searchParams.get('restaurant') || 'gourmet-qr';
  const mesa = searchParams.get('mesa') || '1'; // Enrutamiento por mesa dinámico (default: Mesa 1)

  const { socket } = useSocket();

  // Estados de carga y datos
  const [menu, setMenu] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('Todos');
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [restaurantName, setRestaurantName] = useState('Gourmet QR');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [restaurantActive, setRestaurantActive] = useState<boolean>(true);

  // Estados del modal y carrito
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalNotes, setModalNotes] = useState('');
  const [modalOptions, setModalOptions] = useState<{ [key: string]: { value: string; price: number } }>({});

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem(`gourmetqr_cart_${restaurantSlug}`);
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (e) {
      console.error('Error al inicializar el carrito:', e);
      return [];
    }
  });
  const [showCart, setShowCart] = useState(false);

  // Estados de orden procesada
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [orderStatus, setOrderStatus] = useState<string>(''); // pending, preparing, ready

  // Persistir carrito en localStorage cada vez que cambia
  useEffect(() => {
    localStorage.setItem(`gourmetqr_cart_${restaurantSlug}`, JSON.stringify(cart));
  }, [cart, restaurantSlug]);

  // Cargar orden activa al montar el componente
  useEffect(() => {
    const savedOrderId = localStorage.getItem(`gourmetqr_order_${restaurantSlug}`);
    if (savedOrderId) {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      fetch(`${apiBase}/api/${restaurantSlug}/orders/${savedOrderId}`)
        .then((res) => {
          if (!res.ok) throw new Error('Orden no encontrada o finalizada');
          return res.json();
        })
        .then((data: Order) => {
          if (['pending', 'preparing', 'ready'].includes(data.status)) {
            setCurrentOrder(data);
            setOrderStatus(data.status);
          } else {
            localStorage.removeItem(`gourmetqr_order_${restaurantSlug}`);
          }
        })
        .catch((err) => {
          console.error('Error al recuperar orden activa:', err);
          localStorage.removeItem(`gourmetqr_order_${restaurantSlug}`);
        });
    }
  }, [restaurantSlug]);

  // Limpiar localStorage si la orden es entregada o cancelada
  useEffect(() => {
    if (orderStatus === 'delivered' || orderStatus === 'cancelled') {
      localStorage.removeItem(`gourmetqr_order_${restaurantSlug}`);
    }
  }, [orderStatus, restaurantSlug]);

  // Cargar menú y ajustes iniciales
  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    fetch(`${apiBase}/api/${restaurantSlug}/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data.name) setRestaurantName(data.name);
        if (data.logoUrl) setLogoUrl(data.logoUrl);
        if (data.currency) setCurrencySymbol(data.currency);
        if (data.accentColor) {
          document.documentElement.style.setProperty('--accent', data.accentColor);
        }
        if (data.isActive !== undefined) {
          setRestaurantActive(data.isActive);
        }
      })
      .catch((err) => console.error('Error al cargar ajustes:', err));

    fetch(`${apiBase}/api/${restaurantSlug}/menu`)
      .then((res) => res.json())
      .then((data: Category[]) => {
        setMenu(data);
        if (data.length > 0) {
          setActiveCategory(data[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error al cargar el menú:', err);
        setLoading(false);
      });
  }, []);

  // Escuchar actualizaciones de la orden actual vía WebSockets
  useEffect(() => {
    if (!socket || !currentOrder) return;

    const handleOrderUpdated = (updatedOrder: Order) => {
      if (updatedOrder.id === currentOrder.id) {
        setCurrentOrder(updatedOrder);
        setOrderStatus(updatedOrder.status);
      }
    };

    socket.on('order_updated', handleOrderUpdated);

    return () => {
      socket.off('order_updated', handleOrderUpdated);
    };
  }, [socket, currentOrder]);

  // Escuchar actualizaciones de stock, precios y branding vía WebSockets
  useEffect(() => {
    if (!socket) return;

    const handleProductUpdated = (updatedProduct: any) => {
      setMenu(prevMenu =>
        prevMenu.map(cat => ({
          ...cat,
          products: cat.products.map(p =>
            p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p
          )
        }))
      );
    };

    const handleSettingsUpdated = (data: any) => {
      if (data.settings) {
        if (data.settings.name) setRestaurantName(data.settings.name);
        if (data.settings.logoUrl) setLogoUrl(data.settings.logoUrl);
        if (data.settings.currency) setCurrencySymbol(data.settings.currency);
        if (data.settings.accentColor) {
          document.documentElement.style.setProperty('--accent', data.settings.accentColor);
        }
      }
    };

    socket.on('product_updated', handleProductUpdated);
    socket.on('settings_updated', handleSettingsUpdated);

    return () => {
      socket.off('product_updated', handleProductUpdated);
      socket.off('settings_updated', handleSettingsUpdated);
    };
  }, [socket]);

  // Generar opciones de personalización simuladas según el plato
  const getCustomizationOptions = (product: Product) => {
    if (product.name.toLowerCase().includes('hamburguesa')) {
      return [
        {
          name: 'Término de la carne',
          required: true,
          type: 'radio',
          choices: [
            { name: 'Término Medio', extraPrice: 0 },
            { name: 'Tres Cuartos', extraPrice: 0 },
            { name: 'Bien Cocido', extraPrice: 0 }
          ]
        },
        {
          name: 'Ingredientes Extra',
          required: false,
          type: 'checkbox',
          choices: [
            { name: 'Agregar Queso Cheddar', extraPrice: 1.50 },
            { name: 'Agregar Tocino Crujiente', extraPrice: 2.00 },
            { name: 'Agregar Huevo Frito', extraPrice: 1.50 }
          ]
        }
      ];
    } else if (product.name.toLowerCase().includes('tacos')) {
      return [
        {
          name: 'Tipo de Salsa',
          required: true,
          type: 'radio',
          choices: [
            { name: 'Salsa Verde (Suave)', extraPrice: 0 },
            { name: 'Salsa Roja (Media)', extraPrice: 0 },
            { name: 'Salsa Habanero (Muy Picante 🌶️)', extraPrice: 0.50 }
          ]
        }
      ];
    } else if (product.tags.includes('Vegano')) {
      return [
        {
          name: 'Aderezo Extra',
          required: false,
          type: 'checkbox',
          choices: [
            { name: 'Aderezo de Limón Extra', extraPrice: 0.50 },
            { name: 'Extra Aguacate', extraPrice: 2.00 }
          ]
        }
      ];
    } else {
      return [
        {
          name: 'Porción / Tamaño',
          required: true,
          type: 'radio',
          choices: [
            { name: 'Tamaño Regular', extraPrice: 0 },
            { name: 'Tamaño Grande (+ Pro)', extraPrice: 2.50 }
          ]
        }
      ];
    }
  };

  // Manejar click en producto
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setModalQuantity(1);
    setModalNotes('');
    
    // Inicializar opciones requeridas con su primer valor
    const initialOptions: { [key: string]: { value: string; price: number } } = {};
    const options = getCustomizationOptions(product);
    options.forEach(opt => {
      if (opt.required && opt.choices.length > 0) {
        initialOptions[opt.name] = {
          value: opt.choices[0].name,
          price: opt.choices[0].extraPrice
        };
      }
    });
    setModalOptions(initialOptions);
  };

  // Manejar cambio de opciones de radio
  const handleRadioOptionChange = (optionGroupName: string, choiceName: string, extraPrice: number) => {
    setModalOptions(prev => ({
      ...prev,
      [optionGroupName]: { value: choiceName, price: extraPrice }
    }));
  };

  // Manejar cambio de opciones de checkbox
  const handleCheckboxOptionChange = (optionGroupName: string, choiceName: string, extraPrice: number, isChecked: boolean) => {
    setModalOptions(prev => {
      const current = prev[optionGroupName];
      let newValues: string[] = [];
      let newPrice = 0;

      if (current) {
        const values = current.value ? current.value.split(', ') : [];
        if (isChecked) {
          newValues = [...values, choiceName];
          newPrice = current.price + extraPrice;
        } else {
          newValues = values.filter(v => v !== choiceName);
          newPrice = Math.max(0, current.price - extraPrice);
        }
      } else {
        if (isChecked) {
          newValues = [choiceName];
          newPrice = extraPrice;
        }
      }

      return {
        ...prev,
        [optionGroupName]: {
          value: newValues.join(', '),
          price: parseFloat(newPrice.toFixed(2))
        }
      };
    });
  };

  // Agregar al carrito
  const handleAddToCart = () => {
    if (!selectedProduct) return;

    const selectedOptionsList = Object.entries(modalOptions)
      .filter(([_, opt]) => opt.value !== '')
      .map(([groupName, opt]) => ({
        name: groupName,
        value: opt.value,
        extraPrice: opt.price
      }));

    const optionsExtraTotal = selectedOptionsList.reduce((acc, opt) => acc + opt.extraPrice, 0);
    const unitPrice = Number(selectedProduct.price) + optionsExtraTotal;
    const totalPrice = unitPrice * modalQuantity;

    const newItem: CartItem = {
      cartId: `${selectedProduct.id}-${Date.now()}`,
      product: selectedProduct,
      quantity: modalQuantity,
      specialNotes: modalNotes,
      selectedOptions: selectedOptionsList,
      totalPrice: parseFloat(totalPrice.toFixed(2))
    };

    setCart(prev => [...prev, newItem]);
    setSelectedProduct(null);
  };

  // Eliminar del carrito
  const handleRemoveFromCart = (cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  // Actualizar notas de ítem del carrito
  const handleUpdateItemNotes = (cartId: string, notes: string) => {
    setCart(prev => prev.map(item => {
      if (item.cartId === cartId) {
        return { ...item, specialNotes: notes };
      }
      return item;
    }));
  };

  // Calcular el total del carrito
  const calculateCartTotal = () => {
    return cart.reduce((acc, item) => acc + item.totalPrice, 0);
  };

  // Enviar orden a la cocina
  const handleSendOrder = (totalAmountWithService: number) => {
    if (cart.length === 0) return;

    const orderData = {
      tableNumber: mesa,
      totalAmount: totalAmountWithService,
      items: cart.map(item => {
        const optionsExtraTotal = item.selectedOptions.reduce((acc, opt) => acc + opt.extraPrice, 0);
        return {
          productId: item.product.id,
          quantity: item.quantity,
          specialNotes: item.specialNotes,
          unitPrice: Number(item.product.price) + optionsExtraTotal,
          options: item.selectedOptions // Se guarda como JSON
        };
      })
    };

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    fetch(`${apiBase}/api/${restaurantSlug}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    })
      .then(res => res.json())
      .then((data: Order) => {
        setCurrentOrder(data);
        setOrderStatus(data.status);
        setCart([]); // Vaciar carrito
        setShowCart(false);
        localStorage.setItem(`gourmetqr_order_${restaurantSlug}`, data.id);
      })
      .catch(err => {
        console.error('Error al enviar la orden:', err);
        alert('Hubo un problema al enviar tu orden a la cocina. Por favor intenta de nuevo.');
      });
  };

  // Filtrar productos
  const getFilteredProducts = (category: Category) => {
    if (!category.products) return [];
    
    return category.products.filter(product => {
      if (!product.isActive) return false; // Ocultar si el dueño lo marcó sin stock
      if (activeFilter === 'Todos') return true;
      if (activeFilter === 'Vegano') return product.tags.includes('Vegano');
      if (activeFilter === 'Sin Gluten') return product.tags.includes('Sin Gluten');
      if (activeFilter === 'Picante') return product.tags.includes('Picante');
      if (activeFilter === 'Popular') return product.tags.includes('Popular');
      return true;
    });
  };

  if (loading) {
    return (
      <div className="waiting-screen">
        <div className="waiting-spinner"></div>
        <p>Cargando menú delicioso...</p>
      </div>
    );
  }

  if (!restaurantActive) {
    return (
      <div className="waiting-screen suspended-screen" style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', boxSizing: 'border-box' }}>
        <span style={{ fontSize: '64px', display: 'block', marginBottom: '20px' }}>🛎️</span>
        <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '12px', color: '#fff' }}>Servicio Temporalmente Suspendido</h2>
        <p style={{ color: '#94a3b8', maxWidth: '400px', margin: '0 auto', fontSize: '16px', lineHeight: '1.6' }}>
          Este restaurante no se encuentra activo en este momento. Por favor, contacta directamente al personal o al administrador del local.
        </p>
      </div>
    );
  }

  // Si el cliente tiene una orden enviada y activa, muestra la pantalla de espera
  if (currentOrder && (orderStatus === 'pending' || orderStatus === 'preparing' || orderStatus === 'ready')) {
    return (
      <div className="waiting-screen">
        <h2 className="waiting-title" style={{ marginBottom: '8px' }}>Seguimiento de tu Orden</h2>
        <p className="waiting-subtitle" style={{ marginBottom: '24px' }}>Mesa {mesa} • Sincronizado en tiempo real</p>

        {/* Tracking Vertical Premium */}
        <div className="order-tracking-vertical">
          {/* Paso 1: Recibido */}
          <div className={`tracking-step ${orderStatus === 'pending' ? 'active' : ''} ${(orderStatus === 'preparing' || orderStatus === 'ready') ? 'completed' : ''}`}>
            <div className="step-node">
              <span>{orderStatus === 'preparing' || orderStatus === 'ready' ? '✓' : '🛎️'}</span>
            </div>
            <div className="step-info">
              <h4 className="step-title">Orden Recibida</h4>
              <p className="step-desc">
                {orderStatus === 'pending' ? 'Recibida en cocina. Preparando ingredientes...' : 'Orden recibida y asignada con éxito.'}
              </p>
            </div>
          </div>

          {/* Conector 1 */}
          <div className={`tracking-connector ${(orderStatus === 'preparing' || orderStatus === 'ready') ? 'filled' : ''}`}></div>

          {/* Paso 2: Preparando */}
          <div className={`tracking-step ${orderStatus === 'preparing' ? 'active' : ''} ${orderStatus === 'ready' ? 'completed' : ''}`}>
            <div className="step-node">
              <span>{orderStatus === 'ready' ? '✓' : '🍳'}</span>
            </div>
            <div className="step-info">
              <h4 className="step-title">En Preparación</h4>
              <p className="step-desc">
                {orderStatus === 'pending' && 'En fila para iniciar preparación.'}
                {orderStatus === 'preparing' && 'El chef está cocinando tu orden al fuego.'}
                {orderStatus === 'ready' && 'Cocción finalizada a la perfección.'}
              </p>
            </div>
          </div>

          {/* Conector 2 */}
          <div className={`tracking-connector ${orderStatus === 'ready' ? 'filled' : ''}`}></div>

          {/* Paso 3: Listo */}
          <div className={`tracking-step status-ready-active ${orderStatus === 'ready' ? 'active' : ''}`}>
            <div className="step-node">
              <span>{orderStatus === 'ready' ? '🍽️' : '🛎️'}</span>
            </div>
            <div className="step-info">
              <h4 className="step-title">Listo para Servir</h4>
              <p className="step-desc">
                {orderStatus === 'ready' ? '¡Tu comida va en camino con el mesero!' : 'Esperando que termine la preparación.'}
              </p>
            </div>
          </div>
        </div>

        <div className="waiting-order-summary">
          <div className="summary-title">Mesa {mesa} - Resumen de Pedido</div>
          {currentOrder?.items && currentOrder.items.map((item: any, idx: number) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span>{item.quantity}x {item.product?.name || 'Platillo'}</span>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>${((Number(item.unitPrice) || 0) * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '10px', fontWeight: 700 }}>
            <span>Total</span>
            <span style={{ color: 'var(--accent)' }}>${Number(currentOrder?.totalAmount || 0).toFixed(2)}</span>
          </div>
        </div>

        {orderStatus === 'ready' && (
          <button 
            className="action-btn-large pulse-button" 
            style={{ marginTop: '24px' }}
            onClick={() => {
              setCurrentOrder(null);
              setOrderStatus('');
            }}
          >
            Pedir Algo Más
          </button>
        )}
      </div>
    );
  }

  const activeCategoryData = menu.find(c => c.id === activeCategory);
  const filteredProducts = activeCategoryData ? getFilteredProducts(activeCategoryData) : [];

  return (
    <div className="menu-container animate-fade-in">
      {/* Header Fijo */}
      <header className="menu-header glass">
        <div className="brand-section">
          <div className="brand-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {logoUrl && (
              <img 
                src={logoUrl} 
                alt="Logo" 
                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} 
              />
            )}
            <h1>{restaurantName}</h1>
          </div>
          <div className="table-badge">
            MESA {mesa}
          </div>
        </div>

        {/* Pestañas de Categorías */}
        <nav className="categories-nav">
          {menu.map((category) => (
            <button
              key={category.id}
              className={`category-tab ${activeCategory === category.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(category.id)}
            >
              {category.name}
            </button>
          ))}
        </nav>
      </header>

      {/* Filtros Inteligentes */}
      <section className="filters-section">
        {['Todos', 'Popular', 'Vegano', 'Sin Gluten', 'Picante'].map((filter) => (
          <button
            key={filter}
            className={`filter-btn ${activeFilter === filter ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter === 'Picante' && '🌶️ '}
            {filter === 'Vegano' && '🥬 '}
            {filter}
          </button>
        ))}
      </section>

      {/* Lista de Productos */}
      <main className="menu-products">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => {
            const cartItemsForProduct = cart.filter(item => item.product.id === product.id);
            const totalQty = cartItemsForProduct.reduce((acc, item) => acc + item.quantity, 0);
            const totalCost = cartItemsForProduct.reduce((acc, item) => acc + item.totalPrice, 0);

            return (
              <div
                key={product.id}
                className="product-card"
                onClick={() => handleProductClick(product)}
                style={totalQty > 0 ? { borderColor: 'rgba(240, 106, 56, 0.25)', background: 'rgba(22, 26, 34, 0.95)' } : {}}
              >
                {/* Badges de etiquetas */}
                <div className="product-tag-badges">
                  {product.tags.map((tag, i) => (
                    <span key={i} className={`mini-badge ${tag.toLowerCase().replace(' ', '-')}`}>
                      {tag}
                    </span>
                  ))}
                </div>

                {product.imageUrl && (
                  <div className="product-img-wrapper">
                    <img src={product.imageUrl} alt={product.name} className="product-img" />
                    {totalQty > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        background: 'var(--accent)',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 800,
                        borderRadius: 'var(--radius-full)',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'var(--shadow-sm)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        animation: 'scaleUp 0.2s ease-out'
                      }}>
                        {totalQty}
                      </div>
                    )}
                  </div>
                )}

                <div className="product-info">
                  <div className="product-name-row">
                    <h3 className="product-name">{product.name}</h3>
                    {!product.imageUrl && totalQty > 0 && (
                      <span className="table-badge" style={{ padding: '2px 8px', fontSize: '10px' }}>x{totalQty}</span>
                    )}
                  </div>
                  <p className="product-desc">{product.description}</p>
                  <div className="product-footer">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="product-price">{currencySymbol} {Number(product.price).toFixed(2)}</span>
                      {totalQty > 0 && (
                        <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700, marginTop: '2px' }}>
                          Llevas: {currencySymbol} {totalCost.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <button 
                      className="add-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProductClick(product);
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
            No hay platos disponibles con esta etiqueta.
          </div>
        )}
      </main>

      {/* Modal Personalizador de Plato */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {selectedProduct.imageUrl && (
              <div style={{ position: 'relative' }}>
                <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="modal-hero-img" />
                <button className="close-modal-btn" onClick={() => setSelectedProduct(null)}>×</button>
              </div>
            )}

            <div className="modal-body">
              <h2 className="modal-title">{selectedProduct.name}</h2>
              <p className="modal-description">{selectedProduct.description}</p>

              {/* Renderizar Opciones de Personalización */}
              {getCustomizationOptions(selectedProduct).map((optGroup, idx) => (
                <div key={idx} className="option-group">
                  <h4 className="option-group-title">
                    {optGroup.name}
                    {optGroup.required && <span className="option-required-badge">Obligatorio</span>}
                  </h4>

                  {optGroup.choices.map((choice, cIdx) => {
                    const isSelected = optGroup.type === 'radio'
                      ? modalOptions[optGroup.name]?.value === choice.name
                      : (modalOptions[optGroup.name]?.value || '').split(', ').includes(choice.name);

                    return (
                      <div
                        key={cIdx}
                        className="option-item"
                        onClick={() => {
                          console.log('Click en opción:', choice.name, 'Precio:', choice.extraPrice);
                          if (optGroup.type === 'radio') {
                            handleRadioOptionChange(optGroup.name, choice.name, choice.extraPrice);
                          } else {
                            handleCheckboxOptionChange(optGroup.name, choice.name, choice.extraPrice, !isSelected);
                          }
                        }}
                      >
                        <div className="option-label">
                          <input
                            type={optGroup.type}
                            name={optGroup.name}
                            checked={isSelected || false}
                            onChange={() => {}} // React controlado
                            style={{ pointerEvents: 'none', accentColor: 'var(--accent)' }}
                          />
                          <span>{choice.name}</span>
                        </div>
                         {choice.extraPrice > 0 && (
                           <span className="option-price">+{currencySymbol} {choice.extraPrice.toFixed(2)}</span>
                         )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Selector de cantidad */}
              <div className="quantity-section">
                <span className="qty-label">Cantidad</span>
                <div className="qty-controls">
                  <button 
                    className="qty-btn"
                    onClick={() => setModalQuantity(q => Math.max(1, q - 1))}
                  >
                    -
                  </button>
                  <span className="qty-value">{modalQuantity}</span>
                  <button 
                    className="qty-btn"
                    onClick={() => setModalQuantity(q => q + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Notas especiales de cocina */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Notas Especiales para Cocina</h4>
                <input
                  type="text"
                  placeholder="Ej. Sin cebolla, salsa aparte, etc."
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="cart-item-notes"
                  style={{ width: '100%', padding: '12px' }}
                />
              </div>
            </div>

            {/* Acción de agregar */}
            <div className="add-to-cart-action">
              <button className="action-btn-large" onClick={handleAddToCart}>
                <span>Agregar a mi Orden</span>
                <span>
                  {currencySymbol} {(
                    (Number(selectedProduct.price) + 
                    Object.values(modalOptions).reduce((acc, cur) => acc + cur.price, 0)) * 
                    modalQuantity
                  ).toFixed(2)}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra Flotante de Carrito (si hay ítems) */}
      {cart.length > 0 && !showCart && (
        <div className="cart-floating-bar glass pulse-button" onClick={() => setShowCart(true)}>
          <div className="cart-bar-left">
            <div className="cart-icon-wrapper">
              🛒
              <span className="cart-badge">{cart.reduce((acc, cur) => acc + cur.quantity, 0)}</span>
            </div>
            <div className="cart-bar-info">
              <span className="cart-bar-label">Mi Orden</span>
              <span className="cart-bar-total">${calculateCartTotal().toFixed(2)}</span>
            </div>
          </div>
          <span className="cart-bar-action">Ver mi Orden →</span>
        </div>
      )}

      {/* Vista de Carrito / Sincronización */}
      {showCart && (
        <div className="cart-view animate-scale-up">
          <header className="cart-header">
            <button className="back-btn" onClick={() => setShowCart(false)}>←</button>
            <h2>Mi Orden</h2>
            <span className="table-badge">MESA {mesa}</span>
          </header>

          <main className="cart-items-list">
            {cart.map((item) => (
              <div key={item.cartId} className="cart-item">
                <div className="cart-item-header">
                  <h4 className="cart-item-name">{item.product.name}</h4>
                  <button className="cart-item-remove" onClick={() => handleRemoveFromCart(item.cartId)}>
                    Eliminar
                  </button>
                </div>

                {item.selectedOptions.length > 0 && (
                  <div className="cart-item-options">
                    {item.selectedOptions.map((opt, oIdx) => (
                      <span key={oIdx} className="cart-item-option-pill">
                        {opt.name}: {opt.value}
                      </span>
                    ))}
                  </div>
                )}

                <div className="cart-item-footer">
                  <div className="qty-controls" style={{ transform: 'scale(0.85)', transformOrigin: 'left' }}>
                    <button 
                      className="qty-btn"
                      onClick={() => {
                        if (item.quantity > 1) {
                          setCart(prev => prev.map(i => {
                            if (i.cartId === item.cartId) {
                              const unitPrice = i.totalPrice / i.quantity;
                              return {
                                ...i,
                                quantity: i.quantity - 1,
                                totalPrice: parseFloat((unitPrice * (i.quantity - 1)).toFixed(2))
                              };
                            }
                            return i;
                          }));
                        }
                      }}
                    >
                      -
                    </button>
                    <span className="qty-value">{item.quantity}</span>
                    <button 
                      className="qty-btn"
                      onClick={() => {
                        setCart(prev => prev.map(i => {
                          if (i.cartId === item.cartId) {
                            const unitPrice = i.totalPrice / i.quantity;
                            return {
                              ...i,
                              quantity: i.quantity + 1,
                              totalPrice: parseFloat((unitPrice * (i.quantity + 1)).toFixed(2))
                            };
                          }
                          return i;
                        }));
                      }}
                    >
                      +
                    </button>
                  </div>
                  <span className="product-price">${item.totalPrice.toFixed(2)}</span>
                </div>

                <input
                  type="text"
                  placeholder="Nota especial (ej. sin cebolla)"
                  value={item.specialNotes}
                  onChange={(e) => handleUpdateItemNotes(item.cartId, e.target.value)}
                  className="cart-item-notes"
                />
              </div>
            ))}
          </main>

          <footer className="cart-summary-section">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{currencySymbol} {calculateCartTotal().toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>IVA (10% Incluido)</span>
              <span>{currencySymbol} {(calculateCartTotal() * 0.10).toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Servicio (10%)</span>
              <span>{currencySymbol} {(calculateCartTotal() * 0.10).toFixed(2)}</span>
            </div>
            <div className="summary-row total">
              <span>Total a Pagar</span>
              <span className="total-price">{currencySymbol} {(calculateCartTotal() * 1.10).toFixed(2)}</span>
            </div>

            <button 
              className="action-btn-large pulse-button" 
              style={{ marginTop: '16px' }}
              onClick={() => {
                const totalAmountWithService = calculateCartTotal() * 1.10;
                // Modificado para pasar el total real calculado
                handleSendOrder(totalAmountWithService);
              }}
            >
              <span>Enviar a la Cocina</span>
              <span>{currencySymbol} {(calculateCartTotal() * 1.10).toFixed(2)}</span>
            </button>
          </footer>
        </div>
      )}
    </div>
  );
};
