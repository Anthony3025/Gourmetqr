require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH']
  }
});

const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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

// Cargar Routers Modulares
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes')(io);
const orderRoutes = require('./routes/orderRoutes')(io);
const settingsRoutes = require('./routes/settingsRoutes')(io);

app.use('/api', authRoutes);
app.use('/api', productRoutes);
app.use('/api', orderRoutes);
app.use('/api', settingsRoutes);

// --- SOCKET.IO ---
io.on('connection', (socket) => {
  console.log(`WebSocket conectado: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`WebSocket desconectado: ${socket.id}`);
  });
});

// Iniciar
server.listen(PORT, () => {
  console.log(`Servidor modular corriendo en http://localhost:${PORT}`);
});
