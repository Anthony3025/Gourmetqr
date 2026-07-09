const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const bcrypt = require('bcryptjs');

async function main() {
  // Limpiar base de datos existente
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.restaurant.deleteMany({});

  console.log('Base de datos limpiada.');

  // 1. Crear Restaurante por defecto (Multi-tenant ready)
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const restaurant = await prisma.restaurant.create({
    data: {
      slug: 'gourmet-qr',
      name: 'Gourmet QR',
      accentColor: '#ff5a1f',
      currency: '$',
      kitchenPin: '1234',
      adminEmail: 'admin@gourmet.com',
      adminPassword: hashedPassword
    }
  });

  console.log(`Restaurante '${restaurant.name}' creado con ID: ${restaurant.id}`);

  // 2. Crear Categorías asociadas al restaurante
  const entradas = await prisma.category.create({
    data: { name: 'Entradas', displayOrder: 1, restaurantId: restaurant.id }
  });
  const platosFuertes = await prisma.category.create({
    data: { name: 'Platos Fuertes', displayOrder: 2, restaurantId: restaurant.id }
  });
  const bebidas = await prisma.category.create({
    data: { name: 'Bebidas', displayOrder: 3, restaurantId: restaurant.id }
  });
  const postres = await prisma.category.create({
    data: { name: 'Postres', displayOrder: 4, restaurantId: restaurant.id }
  });

  console.log('Categorías creadas.');

  // 3. Crear Productos asociados al restaurante y su categoría
  // Entradas
  await prisma.product.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: entradas.id,
      name: 'Tequeños de Queso',
      description: '5 deditos de queso crujientes acompañados de salsa tártara de la casa.',
      price: 8.50,
      imageUrl: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=400&q=80',
      tags: ['Sin Gluten', 'Popular']
    }
  });

  await prisma.product.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: entradas.id,
      name: 'Nachos con Queso y Guacamole',
      description: 'Totopos de maíz crujientes bañados en queso fundido cheddar, jalapeños y guacamole fresco.',
      price: 10.90,
      imageUrl: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=400&q=80',
      tags: ['Vegano', 'Picante']
    }
  });

  // Platos Fuertes
  await prisma.product.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: platosFuertes.id,
      name: 'Hamburguesa Premium Especial',
      description: '200g de carne de res premium, queso cheddar fundido, tocino crujiente, lechuga, tomate y salsa especial de la casa en pan brioche.',
      price: 14.50,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80',
      tags: ['Popular']
    }
  });

  await prisma.product.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: platosFuertes.id,
      name: 'Tacos Al Pastor (3 unidades)',
      description: 'Deliciosa carne de cerdo marinada al pastor sobre tortillas de maíz, cebolla, cilantro y piña asada, acompañados de salsa picante.',
      price: 11.20,
      imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=400&q=80',
      tags: ['Picante', 'Sin Gluten']
    }
  });

  await prisma.product.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: platosFuertes.id,
      name: 'Ensalada Bowl Vegana',
      description: 'Quinoa orgánica, aguacate, garbanzos crujientes, camote asado, espinaca tierna y aderezo tahini-limón.',
      price: 12.00,
      imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80',
      tags: ['Vegano', 'Sin Gluten']
    }
  });

  // Bebidas
  await prisma.product.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: bebidas.id,
      name: 'Limonada de Coco Cremosita',
      description: 'Limonada frapeada preparada con leche de coco premium y limón fresco.',
      price: 4.50,
      imageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=400&q=80',
      tags: []
    }
  });

  await prisma.product.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: bebidas.id,
      name: 'Cerveza Artesanal IPA',
      description: 'Cerveza local de lúpulo intenso con notas cítricas y amargor balanceado (500ml).',
      price: 5.50,
      imageUrl: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=400&q=80',
      tags: []
    }
  });

  // Postres
  await prisma.product.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: postres.id,
      name: 'Volcán de Chocolate con Helado',
      description: 'Bizcocho de chocolate caliente con centro líquido fundido, acompañado de una bola de helado de vainilla artesanal.',
      price: 7.90,
      imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=400&q=80',
      tags: ['Popular']
    }
  });

  await prisma.product.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: postres.id,
      name: 'Cheesecake de Frutos Rojos',
      description: 'Tarta de queso crema suave con base de galleta crujiente y cobertura de mermelada casera de frutos del bosque.',
      price: 6.80,
      imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=400&q=80',
      tags: []
    }
  });

  console.log('Productos de prueba creados.');
  console.log('Semilla completada exitosamente.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
