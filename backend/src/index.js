require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const app = express();
app.set('trust proxy', 1);
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim()) 
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH']
  }
});

const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Middleware simple para parsear cookies manualmente sin dependencias
app.use((req, res, next) => {
  const list = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      let [name, ...rest] = cookie.split('=');
      name = name ? name.trim() : '';
      if (!name) return;
      const value = rest.join('=').trim();
      if (!value) return;
      list[name] = decodeURIComponent(value);
    });
  }
  req.cookies = list;
  next();
});

// Asegurar que la carpeta de subidas existe
fs.mkdirSync(path.join(__dirname, '../uploads'), { recursive: true });
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Log de peticiones
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// --- RUTA UTILERÍA: Generador de QR local libre de CORS ---
app.get('/api/qr/base64', async (req, res) => {
  const { data } = req.query;
  if (!data) {
    return res.status(400).json({ error: 'El parámetro data es requerido.' });
  }
  try {
    const qrDataUrl = await QRCode.toDataURL(data, { 
      width: 300, 
      margin: 1 
    });
    res.json({ qrDataUrl });
  } catch (error) {
    console.error('Error al generar QR base64:', error);
    res.status(500).json({ error: 'Error al generar el código QR.' });
  }
});

// --- RUTA UTILERÍA: Generador de QR local en formato de Imagen PNG directo ---
app.get('/api/qr/image', async (req, res) => {
  const { data } = req.query;
  if (!data) {
    return res.status(400).send('El parámetro data es requerido.');
  }
  try {
    const buffer = await QRCode.toBuffer(data, {
      width: 300,
      margin: 1
    });
    res.type('png');
    res.send(buffer);
  } catch (error) {
    console.error('Error al generar imagen de QR:', error);
    res.status(500).send('Error al generar el código QR.');
  }
});

// Cargar Routers Modulares
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes')(io);
const orderRoutes = require('./routes/orderRoutes')(io);
const settingsRoutes = require('./routes/settingsRoutes')(io);
const superadminRoutes = require('./routes/superadminRoutes');
const staffRoutes = require('./routes/staffRoutes');

app.use('/api', authRoutes);
app.use('/api', productRoutes);
app.use('/api', orderRoutes);
app.use('/api', settingsRoutes);
app.use('/api', superadminRoutes);
app.use('/api', staffRoutes);

// --- SOCKET.IO ---
io.on('connection', (socket) => {
  console.log(`WebSocket conectado: ${socket.id}`);

  // Recibir llamado de mesa y retransmitir
  socket.on('request_service', (data) => {
    const requestData = {
      id: Math.random().toString(36).substring(2, 9),
      restaurantSlug: data.restaurantSlug,
      tableNumber: data.tableNumber,
      type: data.type, // 'waiter' o 'bill'
      createdAt: new Date().toISOString()
    };
    io.emit('new_service_request', requestData);
  });

  // Marcar como atendido y retransmitir
  socket.on('resolve_service', (data) => {
    io.emit('service_resolved', data); // data: { id, restaurantSlug }
  });

  // Retransmitir señal de auto-servicio (Retira en Barra) al cliente del menú
  socket.on('order_ready_to_collect', (data) => {
    io.emit('order_ready_to_collect', data); // data: { orderId, restaurantSlug }
  });

  socket.on('disconnect', () => {
    console.log(`WebSocket desconectado: ${socket.id}`);
  });
});

// Iniciar
server.listen(PORT, () => {
  console.log(`Servidor modular corriendo en http://localhost:${PORT}`);
});
