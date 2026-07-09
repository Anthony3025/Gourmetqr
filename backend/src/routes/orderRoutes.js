const express = require('express');
const orderController = require('../controllers/orderController');
const resolveRestaurant = require('../middlewares/resolveRestaurant');
const { authenticateToken } = require('../middlewares/auth');

module.exports = (io) => {
  const router = express.Router();

  // Public/Kitchen order endpoints
  router.get('/:restaurantSlug/orders', resolveRestaurant, orderController.getActiveOrders);
  router.post('/:restaurantSlug/orders', resolveRestaurant, (req, res) => {
    orderController.createOrder(req, res, io);
  });
  router.patch('/:restaurantSlug/orders/:id/status', resolveRestaurant, (req, res) => {
    orderController.updateOrderStatus(req, res, io);
  });

  // Protected admin endpoints
  router.get('/:restaurantSlug/stats', resolveRestaurant, authenticateToken, orderController.getStats);
  router.get('/:restaurantSlug/mesas/pdf', resolveRestaurant, authenticateToken, orderController.downloadPdf);

  return router;
};
