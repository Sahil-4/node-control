const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const sessionsController = require('../controllers/sessions.controller');

const router = express.Router();
router.use(authMiddleware);

router.get('/', sessionsController.listSessions);

module.exports = router;
