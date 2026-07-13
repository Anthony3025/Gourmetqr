const prisma = require('../config/db');
const bcrypt = require('bcryptjs');

const getStaff = async (req, res) => {
  try {
    const staff = await prisma.user.findMany({
      where: {
        restaurantId: req.restaurant.id,
        role: 'staff'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(staff);
  } catch (error) {
    console.error('Error al obtener personal:', error);
    res.status(500).json({ error: 'Error interno al obtener el personal.' });
  }
};

const createStaff = async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Todos los campos son requeridos (email, contraseña, nombre).' });
  }

  try {
    // Verificar si el correo ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newStaff = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'staff',
        restaurantId: req.restaurant.id
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json(newStaff);
  } catch (error) {
    console.error('Error al crear personal:', error);
    res.status(500).json({ error: 'Error interno al crear el miembro del personal.' });
  }
};

const deleteStaff = async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar que el usuario pertenezca a este restaurante y sea de tipo staff
    const user = await prisma.user.findFirst({
      where: {
        id,
        restaurantId: req.restaurant.id,
        role: 'staff'
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado o no pertenece a este restaurante.' });
    }

    await prisma.user.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Usuario de personal eliminado con éxito.' });
  } catch (error) {
    console.error('Error al eliminar personal:', error);
    res.status(500).json({ error: 'Error interno al eliminar el miembro del personal.' });
  }
};

module.exports = {
  getStaff,
  createStaff,
  deleteStaff
};
