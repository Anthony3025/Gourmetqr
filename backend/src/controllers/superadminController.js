const prisma = require('../config/db');
const bcrypt = require('bcryptjs');

const getRestaurants = async (req, res) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      include: {
        users: {
          where: { role: 'admin' },
          select: { id: true, email: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(restaurants);
  } catch (error) {
    console.error('Error al obtener restaurantes:', error);
    res.status(500).json({ error: 'Error interno al obtener restaurantes.' });
  }
};

const createRestaurant = async (req, res) => {
  const { adminEmail } = req.body;

  if (!adminEmail) {
    return res.status(400).json({ error: 'El correo electrónico del administrador es obligatorio.' });
  }

  try {
    // Generar contraseña temporal segura de 8 caracteres
    const generatedPassword = Math.random().toString(36).substring(2, 10);

    // Generar slug y nombre temporal
    const suffix = Math.random().toString(36).substring(2, 6);
    const name = "Nombre Temporal";
    const slug = `temp-${suffix}`;

    // Verificar si el email de admin ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    });
    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    // Hash de la contraseña generada
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Crear restaurant y usuario en una transacción
    const result = await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name,
          slug,
          accentColor: '#ff5a1f',
          currency: '$',
          kitchenPin: '1234'
        }
      });

      const user = await tx.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Administrador',
          role: 'admin',
          restaurantId: restaurant.id
        }
      });

      return { restaurant, user };
    });

    res.status(201).json({
      restaurant: result.restaurant,
      user: result.user,
      temporaryPassword: generatedPassword
    });
  } catch (error) {
    console.error('Error al crear restaurante:', error);
    res.status(500).json({ error: 'Error interno al crear el restaurante.' });
  }
};

const deleteRestaurant = async (req, res) => {
  const { id } = req.params;

  try {
    // Borrar de forma secuencial todas las dependencias del negocio para evitar violaciones de clave foránea
    await prisma.$transaction(async (tx) => {
      // 1. Borrar detalles de las órdenes
      await tx.orderItem.deleteMany({
        where: {
          order: {
            restaurantId: id
          }
        }
      });

      // 2. Borrar órdenes
      await tx.order.deleteMany({
        where: { restaurantId: id }
      });

      // 3. Borrar tamaños y extras de los productos
      await tx.productSize.deleteMany({
        where: {
          product: {
            restaurantId: id
          }
        }
      });

      await tx.productExtra.deleteMany({
        where: {
          product: {
            restaurantId: id
          }
        }
      });

      // 4. Borrar productos
      await tx.product.deleteMany({
        where: { restaurantId: id }
      });

      // 5. Borrar categorías
      await tx.category.deleteMany({
        where: { restaurantId: id }
      });

      // 6. Borrar usuarios vinculados al restaurante
      await tx.user.deleteMany({
        where: { restaurantId: id }
      });

      // 7. Finalmente, eliminar el restaurante
      await tx.restaurant.delete({
        where: { id }
      });
    });

    res.json({ success: true, message: 'Restaurante y dependencias eliminados con éxito.' });
  } catch (error) {
    console.error('Error al eliminar restaurante:', error);
    res.status(500).json({ error: 'Error interno al eliminar el restaurante y sus dependencias.' });
  }
};

const updateRestaurant = async (req, res) => {
  const { id } = req.params;
  const { name, slug, accentColor, currency, kitchenPin, isActive } = req.body;

  try {
    if (slug) {
      const existing = await prisma.restaurant.findUnique({
        where: { slug }
      });
      if (existing && existing.id !== id) {
        return res.status(400).json({ error: 'El slug ya está en uso.' });
      }
    }

    const updated = await prisma.restaurant.update({
      where: { id },
      data: {
        name,
        slug,
        accentColor,
        currency,
        kitchenPin,
        isActive
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error al actualizar restaurante:', error);
    res.status(500).json({ error: 'Error interno al actualizar el restaurante.' });
  }
};

module.exports = {
  getRestaurants,
  createRestaurant,
  deleteRestaurant,
  updateRestaurant
};
