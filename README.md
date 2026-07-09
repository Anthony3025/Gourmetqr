# Gourmet QR — Sistema de Menú y Comandas Digitales

Gourmet QR es una solución moderna, reactiva y multi-tenant que permite a restaurantes digitalizar su menú y automatizar la recepción de pedidos directo a la cocina. Los clientes escanean un código QR desde su mesa, personalizan su orden y el pedido se procesa y reporta en tiempo real.

---

## 🛠️ Stack Tecnológico

* **Frontend:** React + TypeScript (Vite), React Router, Socket.io Client, html2pdf.js.
* **Backend:** Node.js (Express), Socket.io (WebSockets), Prisma ORM.
* **Base de Datos:** PostgreSQL (local o remoto).

---

## 📂 Arquitectura del Proyecto

El backend está reestructurado modularmente bajo la arquitectura limpia de Controladores y Rutas:

```
QR/
├── backend/
│   ├── src/
│   │   ├── index.js             # Coordinador del Servidor
│   │   ├── config/              # Configuración (db.js)
│   │   ├── middlewares/         # Middleware de JWT y restaurant resolver
│   │   ├── controllers/         # Lógica de negocio (auth, orders, products, settings)
│   │   └── routes/              # Declaración de endpoints REST
│   └── prisma/                  # Esquemas y migraciones de base de datos
└── frontend/
    └── src/
        ├── App.tsx              # Configuración de Router y branding
        └── pages/               # Pantallas (Menu, Cocina, Admin)
```

---

## 🚀 Instalación y Levantamiento Rápido

### Opción A: Con Docker (Recomendado para base de datos rápida)

1. Levanta el contenedor de PostgreSQL:
   ```bash
   docker compose up -d
   ```
2. Accede a la carpeta del backend, instala dependencias y ejecuta las migraciones:
   ```bash
   cd backend
   npm install
   npx prisma migrate dev
   npm run seed
   npm run dev
   ```
3. Levanta el frontend en otra terminal:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## ⚙️ Configuración (.env)

Crea un archivo `.env` dentro de `/backend` con la cadena de conexión de tu base de datos:

```env
DATABASE_URL="postgresql://postgres:your_secure_password_here@127.0.0.1:5432/qrmesa?schema=public"
PORT=3001
JWT_SECRET="una_clave_secreta_segura_para_produccion"
```

---

## 👥 Credenciales por Defecto (Seed)

Al ejecutar `npm run seed`, se crearán los datos básicos del restaurante piloto:

* **Administrador:** `admin@gourmet.com` / `admin123`
* **PIN de Cocina:** `1234`
* **Restaurante Slug:** `gourmet-qr` (Accesible en `http://localhost:5173/gourmet-qr/menu`)
