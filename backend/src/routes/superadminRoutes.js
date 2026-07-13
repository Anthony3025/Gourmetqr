const express = require('express');
const superadminController = require('../controllers/superadminController');
const { authenticateToken, requireSuperadmin } = require('../middlewares/auth');

const router = express.Router();

// Rutas protegidas solo para Superadministradores
router.get('/superadmin/restaurants', authenticateToken, requireSuperadmin, superadminController.getRestaurants);
router.post('/superadmin/restaurants', authenticateToken, requireSuperadmin, superadminController.createRestaurant);
router.patch('/superadmin/restaurants/:id', authenticateToken, requireSuperadmin, superadminController.updateRestaurant);
router.delete('/superadmin/restaurants/:id', authenticateToken, requireSuperadmin, superadminController.deleteRestaurant);

module.exports = router;
