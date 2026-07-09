const express = require('express');
const authController = require('../controllers/authController');
const resolveRestaurant = require('../middlewares/resolveRestaurant');

const router = express.Router();

router.post('/:restaurantSlug/login', resolveRestaurant, authController.login);

module.exports = router;
