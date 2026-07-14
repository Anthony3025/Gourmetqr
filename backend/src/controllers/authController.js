const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { JWT_SECRET } = require('../middlewares/auth');

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
  }

  try {
    // Buscar usuario por email en la base de datos
    const user = await prisma.user.findUnique({
      where: { email },
      include: { restaurant: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }

    // Verificar restricciones de restaurante si estamos bajo un slug específico (y no es superadmin)
    if (req.restaurant && user.role !== 'superadmin') {
      if (user.restaurantId !== req.restaurant.id) {
        return res.status(401).json({ error: 'No tienes acceso a este restaurante.' });
      }
    }

    let isPasswordCorrect = false;

    // Verificar con bcrypt
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isPasswordCorrect = await bcrypt.compare(password, user.password);
    } else {
      // Si está en texto plano, comparar directamente y migrar
      isPasswordCorrect = (password === user.password);
      if (isPasswordCorrect) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword }
        });
        console.log(`Contraseña para ${email} migrada a bcrypt con éxito.`);
      }
    }

    if (!isPasswordCorrect) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }

    // Generar Token JWT con rol y restaurantId
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
        slug: user.restaurant ? user.restaurant.slug : null
      }, 
      JWT_SECRET, 
      { expiresIn: '8h' }
    );

    // Configurar cookie segura con el token JWT
    const isSuper = user.role === 'superadmin';
    const cookieName = isSuper ? 'superadmin_token' : 'admin_token';
    res.cookie(cookieName, token, {
      httpOnly: true,
      secure: true, // Forzado siempre a true para asegurar transmisión HTTPS en Vercel <-> Render
      sameSite: 'none', // Forzado siempre a 'none' para permitir cookies de origen cruzado
      maxAge: 8 * 60 * 60 * 1000 // 8 horas
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      restaurant: user.restaurant ? {
        id: user.restaurant.id,
        name: user.restaurant.name,
        slug: user.restaurant.slug
      } : null
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor en el inicio de sesión.' });
  }
};

const getMe = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { restaurant: true }
    });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      restaurant: user.restaurant ? {
        id: user.restaurant.id,
        name: user.restaurant.name,
        slug: user.restaurant.slug
      } : null
    });
  } catch (error) {
    console.error('Error en getMe:', error);
    res.status(500).json({ error: 'Error al verificar sesión.' });
  }
};

const logout = (req, res) => {
  res.clearCookie('admin_token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });
  res.clearCookie('superadmin_token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });
  return res.json({ success: true });
};

module.exports = {
  login,
  getMe,
  logout
};
