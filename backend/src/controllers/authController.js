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
    if (email !== req.restaurant.adminEmail) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }

    let isPasswordCorrect = false;
    const dbPassword = req.restaurant.adminPassword;

    // Verificar con bcrypt
    if (dbPassword.startsWith('$2a$') || dbPassword.startsWith('$2b$')) {
      isPasswordCorrect = await bcrypt.compare(password, dbPassword);
    } else {
      // Si está en texto plano, comparar directamente
      isPasswordCorrect = (password === dbPassword);
      if (isPasswordCorrect) {
        // Migrar a bcrypt automáticamente
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.restaurant.update({
          where: { id: req.restaurant.id },
          data: { adminPassword: hashedPassword }
        });
        console.log(`Contraseña para ${email} migrada a bcrypt con éxito.`);
      }
    }

    if (!isPasswordCorrect) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }

    // Generar Token JWT
    const token = jwt.sign(
      { 
        id: req.restaurant.id, 
        email: req.restaurant.adminEmail,
        slug: req.restaurant.slug
      }, 
      JWT_SECRET, 
      { expiresIn: '8h' }
    );

    return res.json({
      success: true,
      token,
      restaurant: {
        id: req.restaurant.id,
        name: req.restaurant.name,
        slug: req.restaurant.slug
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor en el inicio de sesión.' });
  }
};

module.exports = {
  login
};
