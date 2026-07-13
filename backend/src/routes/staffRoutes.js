const express = require('express');
const staffController = require('../controllers/staffController');
const resolveRestaurant = require('../middlewares/resolveRestaurant');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// Rutas de gestión de personal, accesibles por Admin de restaurante o Superadmin
router.get('/:restaurantSlug/staff', resolveRestaurant, authenticateToken, requireAdmin, staffController.getStaff);
router.post('/:restaurantSlug/staff', resolveRestaurant, authenticateToken, requireAdmin, staffController.createStaff);
router.delete('/:restaurantSlug/staff/:id', resolveRestaurant, authenticateToken, requireAdmin, staffController.deleteStaff);

module.exports = router;
