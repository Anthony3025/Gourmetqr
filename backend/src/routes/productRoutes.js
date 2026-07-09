const express = require('express');
const productController = require('../controllers/productController');
const resolveRestaurant = require('../middlewares/resolveRestaurant');
const { authenticateToken } = require('../middlewares/auth');

module.exports = (io) => {
  const router = express.Router();

  // Public menu endpoint
  router.get('/:restaurantSlug/menu', resolveRestaurant, productController.getMenu);

  // Protected settings/actions
  router.patch('/:restaurantSlug/products/:id/availability', resolveRestaurant, authenticateToken, (req, res) => {
    productController.changeAvailability(req, res, io);
  });

  router.patch('/:restaurantSlug/products/:id/price', resolveRestaurant, authenticateToken, (req, res) => {
    productController.changePrice(req, res, io);
  });

  router.post('/:restaurantSlug/categories', resolveRestaurant, authenticateToken, productController.createCategory);
  
  router.delete('/:restaurantSlug/categories/:id', resolveRestaurant, authenticateToken, productController.deleteCategory);

  router.post('/:restaurantSlug/products', resolveRestaurant, authenticateToken, (req, res) => {
    productController.createProduct(req, res, io);
  });

  router.delete('/:restaurantSlug/products/:id', resolveRestaurant, authenticateToken, (req, res) => {
    productController.deleteProduct(req, res, io);
  });

  return router;
};
