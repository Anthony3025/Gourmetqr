const express = require('express');
const settingsController = require('../controllers/settingsController');
const resolveRestaurant = require('../middlewares/resolveRestaurant');
const { authenticateToken } = require('../middlewares/auth');

module.exports = (io) => {
  const router = express.Router();

  router.get('/:restaurantSlug/settings', resolveRestaurant, settingsController.getSettings);
  
  router.patch('/:restaurantSlug/settings', resolveRestaurant, authenticateToken, (req, res) => {
    settingsController.updateSettings(req, res, io);
  });

  return router;
};
