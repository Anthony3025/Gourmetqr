const prisma = require('../config/db');
const path = require('path');
const fs = require('fs');

const getMenu = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { 
        restaurantId: req.restaurant.id,
        isActive: true 
      },
      orderBy: { displayOrder: 'asc' },
      include: {
        products: {
          orderBy: { name: 'asc' },
          include: {
            sizes: true,
            extras: true
          }
        }
      }
    });
    res.json(categories);
  } catch (error) {
    console.error('Error al obtener el menú:', error);
    res.status(500).json({ error: 'Error al obtener el menú.' });
  }
};

const changeAvailability = async (req, res, io) => {
  const { id } = req.params;
  const { isActive } = req.body;

  try {
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { isActive: Boolean(isActive) }
    });

    io.emit('product_updated', updatedProduct);
    res.json(updatedProduct);
  } catch (error) {
    console.error('Error al actualizar disponibilidad de producto:', error);
    res.status(500).json({ error: 'Error al cambiar stock del plato.' });
  }
};

const changePrice = async (req, res, io) => {
  const { id } = req.params;
  const { price } = req.body;

  try {
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { price: parseFloat(price) }
    });

    io.emit('product_updated', updatedProduct);
    res.json(updatedProduct);
  } catch (error) {
    console.error('Error al actualizar precio de producto:', error);
    res.status(500).json({ error: 'Error al cambiar el precio del plato.' });
  }
};

const createCategory = async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'El nombre de la categoría es requerido.' });
  }

  try {
    const highestOrder = await prisma.category.findFirst({
      where: { restaurantId: req.restaurant.id },
      orderBy: { displayOrder: 'desc' }
    });
    const nextOrder = highestOrder ? highestOrder.displayOrder + 1 : 1;

    const newCategory = await prisma.category.create({
      data: {
        name,
        restaurantId: req.restaurant.id,
        displayOrder: nextOrder
      }
    });

    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({ error: 'Error al crear la categoría.' });
  }
};

const deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.product.deleteMany({
        where: { categoryId: id }
      });
      await tx.category.delete({
        where: { id }
      });
    });

    res.json({ success: true, message: 'Categoría y productos asociados eliminados correctamente.' });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({ error: 'Error al eliminar la categoría.' });
  }
};

const createProduct = async (req, res, io) => {
    const { name, description, price, categoryId, tags, imageBase64, sizes, extras } = req.body;
 
   if (!name || !price || !categoryId) {
     return res.status(400).json({ error: 'Nombre, precio y categoría son requeridos.' });
   }
 
   try {
     let imageUrl = null;
 
     if (imageBase64 && imageBase64.startsWith('data:image')) {
       const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
       if (matches && matches.length === 3) {
         const ext = matches[1].split('/')[1];
         const base64Data = matches[2];
         const buffer = Buffer.from(base64Data, 'base64');
         
         const filename = `product-${Date.now()}.${ext}`;
         const filepath = path.join(__dirname, '../../uploads', filename);
         
         fs.writeFileSync(filepath, buffer);
         
         const host = req.headers.host;
         const protocol = req.protocol;
         imageUrl = `${protocol}://${host}/uploads/${filename}`;
       }
     }
 
     const newProduct = await prisma.product.create({
       data: {
         restaurantId: req.restaurant.id,
         categoryId,
         name,
         description: description || '',
         price: parseFloat(price),
         imageUrl,
         tags: Array.isArray(tags) ? tags : [],
         isActive: true,
         sizes: sizes && Array.isArray(sizes) ? {
           create: sizes.map(s => ({
             name: s.name,
             price: parseFloat(s.price)
           }))
         } : undefined,
         extras: extras && Array.isArray(extras) ? {
           create: extras.map(e => ({
             name: e.name,
             price: parseFloat(e.price)
           }))
         } : undefined
       },
       include: {
         sizes: true,
         extras: true
       }
     });

    io.emit('product_created', newProduct);
    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ error: 'Error al crear el producto.' });
  }
};

const deleteProduct = async (req, res, io) => {
  const { id } = req.params;

  try {
    const deletedProduct = await prisma.product.delete({
      where: { id }
    });

    io.emit('product_deleted', deletedProduct);
    res.json({ success: true, message: 'Producto eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ error: 'Error al eliminar el producto.' });
  }
};

module.exports = {
  getMenu,
  changeAvailability,
  changePrice,
  createCategory,
  deleteCategory,
  createProduct,
  deleteProduct
};
