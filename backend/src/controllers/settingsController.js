const prisma = require('../config/db');
const path = require('path');
const fs = require('fs');

const getSettings = async (req, res) => {
  try {
    const adminUser = await prisma.user.findFirst({
      where: {
        restaurantId: req.restaurant.id,
        role: 'admin'
      },
      select: { email: true }
    });

    res.json({
      id: req.restaurant.id,
      slug: req.restaurant.slug,
      name: req.restaurant.name,
      logoUrl: req.restaurant.logoUrl,
      accentColor: req.restaurant.accentColor,
      currency: req.restaurant.currency,
      kitchenPin: req.restaurant.kitchenPin,
      adminEmail: adminUser ? adminUser.email : '',
      isActive: req.restaurant.isActive // Agregado para soportar activar/desactivar local
    });
  } catch (error) {
    console.error('Error al obtener ajustes:', error);
    res.status(500).json({ error: 'Error al obtener los ajustes.' });
  }
};

const updateSettings = async (req, res, io) => {
  const { name, logoUrl, logoBase64, accentColor, currency, kitchenPin, adminEmail, adminPassword } = req.body;
  try {
    let finalLogoUrl = logoUrl;

    if (logoBase64 && logoBase64.startsWith('data:image')) {
      const matches = logoBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const ext = matches[1].split('/')[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        const filename = `logo-${Date.now()}.${ext}`;
        const filepath = path.join(__dirname, '../../uploads', filename);
        
        fs.writeFileSync(filepath, buffer);
        
        const host = req.headers.host;
        const protocol = req.protocol;
        finalLogoUrl = `${protocol}://${host}/uploads/${filename}`;
      }
    }

    // Actualizar datos del restaurante
    const updated = await prisma.restaurant.update({
      where: { id: req.restaurant.id },
      data: {
        name: name !== undefined ? name : req.restaurant.name,
        slug: req.body.slug !== undefined ? req.body.slug : req.restaurant.slug,
        logoUrl: finalLogoUrl !== undefined ? finalLogoUrl : req.restaurant.logoUrl,
        accentColor: accentColor !== undefined ? accentColor : req.restaurant.accentColor,
        currency: currency !== undefined ? currency : req.restaurant.currency,
        kitchenPin: kitchenPin !== undefined ? kitchenPin : req.restaurant.kitchenPin
      }
    });

    // Actualizar credenciales de admin si es necesario
    if (adminEmail !== undefined || (adminPassword !== undefined && adminPassword !== '')) {
      const adminUser = await prisma.user.findFirst({
        where: {
          restaurantId: req.restaurant.id,
          role: 'admin'
        }
      });

      if (adminUser) {
        const userUpdateData = {};
        if (adminEmail !== undefined) userUpdateData.email = adminEmail;
        if (adminPassword !== undefined && adminPassword !== '') {
          const bcrypt = require('bcryptjs');
          userUpdateData.password = await bcrypt.hash(adminPassword, 10);
        }

        await prisma.user.update({
          where: { id: adminUser.id },
          data: userUpdateData
        });
      }
    }
    
    io.emit('settings_updated', { restaurantId: updated.id, settings: updated });
    res.json(updated);
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ error: 'Error al guardar los ajustes de marca.' });
  }
};

module.exports = {
  getSettings,
  updateSettings
};
