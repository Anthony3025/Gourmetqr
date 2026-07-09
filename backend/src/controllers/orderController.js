const prisma = require('../config/db');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');

const getActiveOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        restaurantId: req.restaurant.id,
        status: {
          in: ['pending', 'preparing', 'ready']
        }
      },
      orderBy: { createdAt: 'asc' },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });
    res.json(orders);
  } catch (error) {
    console.error('Error al obtener órdenes:', error);
    res.status(500).json({ error: 'Error al obtener las órdenes.' });
  }
};

const createOrder = async (req, res, io) => {
  const { tableNumber, items, totalAmount } = req.body;

  if (!tableNumber || !items || !items.length || totalAmount === undefined) {
    return res.status(400).json({ error: 'Datos de la orden incompletos.' });
  }

  try {
    const newOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          restaurantId: req.restaurant.id,
          tableNumber: String(tableNumber),
          totalAmount: parseFloat(totalAmount),
          status: 'pending'
        }
      });

      const itemData = items.map(item => ({
        orderId: order.id,
        productId: item.productId,
        quantity: parseInt(item.quantity),
        specialNotes: item.specialNotes || '',
        unitPrice: parseFloat(item.unitPrice),
        options: item.options || {}
      }));

      await tx.orderItem.createMany({
        data: itemData
      });

      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });
    });

    console.log(`Nueva orden: ID ${newOrder.id} - Mesa ${newOrder.tableNumber} [${req.restaurant.name}]`);
    io.emit('new_order', newOrder);
    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error al crear orden:', error);
    res.status(500).json({ error: 'Error al crear la orden.' });
  }
};

const updateOrderStatus = async (req, res, io) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'preparing', 'ready', 'delivered'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Estado inválido.' });
  }

  try {
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    console.log(`Orden ${id} actualizada a: ${status}`);
    io.emit('order_updated', updatedOrder);
    res.json(updatedOrder);
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ error: 'Error al actualizar la orden.' });
  }
};

const getStats = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayOrders = await prisma.order.findMany({
      where: {
        restaurantId: req.restaurant.id,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    const totalSales = todayOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const ordersCount = todayOrders.length;

    const activeTables = await prisma.order.groupBy({
      by: ['tableNumber'],
      where: {
        restaurantId: req.restaurant.id,
        status: { in: ['pending', 'preparing', 'ready'] }
      }
    });
    const activeTablesCount = activeTables.length;

    const completedOrders = await prisma.order.findMany({
      where: {
        restaurantId: req.restaurant.id,
        status: { in: ['ready', 'delivered'] },
        createdAt: { gte: startOfDay, lte: endOfDay }
      }
    });

    let totalDurationMinutes = 0;
    let completedCount = 0;

    completedOrders.forEach(order => {
      const diffMs = order.updatedAt.getTime() - order.createdAt.getTime();
      const diffMin = Math.round(diffMs / 1000 / 60);
      if (diffMin >= 0) {
        totalDurationMinutes += diffMin;
        completedCount++;
      }
    });

    const averageKitchenTime = completedCount > 0 ? Math.round(totalDurationMinutes / completedCount) : 0;

    res.json({
      totalSales,
      ordersCount,
      activeTablesCount,
      averageKitchenTime
    });
  } catch (error) {
    console.error('Error al calcular estadísticas:', error);
    res.status(500).json({ error: 'Error al procesar estadísticas.' });
  }
};

const downloadPdf = async (req, res) => {
  const { mesa, start, end } = req.query;
  const restaurantName = req.restaurant.name;

  try {
    let filename = 'QR_Mesa.pdf';
    if (mesa) {
      filename = `QR_Mesa_${mesa}_${restaurantName.replace(/\s+/g, '_')}.pdf`;
    } else {
      filename = `QRs_Lote_${start}_al_${end}_${restaurantName.replace(/\s+/g, '_')}.pdf`;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    doc.pipe(res);

    const mmToPt = (mm) => mm * 2.834645;

    const cardWidth = mmToPt(90);  
    const cardHeight = mmToPt(130); 
    const startX = mmToPt(12.9);    
    const startY = mmToPt(6);       
    const gapX = mmToPt(10);        
    const gapY = mmToPt(6);         

    const host = req.headers.host;
    const protocol = req.protocol;

    const generateCard = async (mesaNum, x, y) => {
      const urlMesa = `${protocol}://${host}/menu?mesa=${mesaNum}&restaurant=${req.restaurant.slug}`;
      const qrBuffer = await QRCode.toBuffer(urlMesa, { width: 300, margin: 1 });

      doc.lineWidth(0.5)
         .rect(x, y, cardWidth, cardHeight)
         .stroke('#C8C8C8');

      doc.fillColor('#64748B')
         .font('Helvetica-Bold')
         .fontSize(10)
         .text(restaurantName.toUpperCase(), x, y + mmToPt(15), {
           width: cardWidth,
           align: 'center'
         });

      doc.fillColor('#0F172A')
         .font('Helvetica-Bold')
         .fontSize(22)
         .text(`MESA ${mesaNum}`, x, y + mmToPt(26), {
           width: cardWidth,
           align: 'center'
         });

      doc.image(qrBuffer, x + (cardWidth - mmToPt(60)) / 2, y + mmToPt(36), {
        width: mmToPt(60),
        height: mmToPt(60)
      });

      doc.fillColor('#94A3B8')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text('ESCANEA PARA ORDENAR', x, y + mmToPt(106), {
           width: cardWidth,
           align: 'center'
         });

      doc.fillColor('#B4B4B4')
         .font('Helvetica')
         .fontSize(6)
         .text(urlMesa, x, y + mmToPt(118), {
           width: cardWidth,
           align: 'center'
         });
    };

    if (mesa) {
      const x = (mmToPt(215.9) - cardWidth) / 2;
      const y = (mmToPt(279.4) - cardHeight) / 2;
      await generateCard(mesa, x, y);
      doc.end();
    } else {
      const startMesa = parseInt(start) || 1;
      const endMesa = parseInt(end) || 10;
      
      for (let i = 0; i <= (endMesa - startMesa); i++) {
        const mesaNum = String(startMesa + i);
        const pageIndex = i % 4;

        if (i > 0 && pageIndex === 0) {
          doc.addPage();
        }

        const col = pageIndex % 2;
        const row = Math.floor(pageIndex / 2);

        const x = startX + col * (cardWidth + gapX);
        const y = startY + row * (cardHeight + gapY);

        await generateCard(mesaNum, x, y);
      }
      doc.end();
    }
  } catch (error) {
    console.error('Error al generar PDF en el servidor:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al generar el documento PDF.' });
    }
  }
};

module.exports = {
  getActiveOrders,
  createOrder,
  updateOrderStatus,
  getStats,
  downloadPdf
};
