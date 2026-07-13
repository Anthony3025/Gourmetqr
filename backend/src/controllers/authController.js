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

module.exports = {
  login
};
