const express = require('express');

const authMiddleware = require('../middleware/auth.middleware');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.get('/verify', authMiddleware, authController.verifyAuth);

module.exports = router;
