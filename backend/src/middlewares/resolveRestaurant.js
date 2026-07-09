const prisma = require('../config/db');

const resolveRestaurant = async (req, res, next) => {
  const { restaurantSlug } = req.params;
  
  if (!restaurantSlug) {
    return res.status(400).json({ error: 'Restaurant slug es requerido.' });
  }

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: restaurantSlug }
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurante no encontrado.' });
    }

    req.restaurant = restaurant;
    next();
  } catch (error) {
    console.error('Error al resolver restaurante:', error);
    res.status(500).json({ error: 'Error interno del servidor al verificar el restaurante.' });
  }
};

module.exports = resolveRestaurant;
