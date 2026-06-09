const express = require('express');

const authMiddleware = require('../middleware/auth.middleware');
const systemController = require('../controllers/system.controller');

const router = express.Router();

router.use(authMiddleware);
router.post('/', systemController.executeAction);

module.exports = router;
