const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const tunnelService = require('../services/tunnel.service');

const router = express.Router();
router.use(authMiddleware);

router.get('/status', (req, res) => {
  res.json(tunnelService.status());
});

router.post('/start', async (req, res, next) => {
  try {
    const port = Number(process.env.PORT) || 3000;
    const result = await tunnelService.start(port);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/stop', (req, res) => {
  tunnelService.stop();
  res.status(204).end();
});

module.exports = router;
