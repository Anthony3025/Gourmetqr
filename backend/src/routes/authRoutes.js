const express = require('express');
const authController = require('../controllers/authController');
const resolveRestaurant = require('../middlewares/resolveRestaurant');

const router = express.Router();

// Login genérico sin slug (para panel /admin sin slug conocido o tenants nuevos)
router.post('/auth/login', authController.login);

// Login con slug específico (verifica que el usuario pertenece al restaurante)
router.post('/:restaurantSlug/login', resolveRestaurant, authController.login);

module.exports = router;
