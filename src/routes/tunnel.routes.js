const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const tunnelService = require('../services/tunnel.service');
const logger = require('../services/logger.service');

const router = express.Router();
router.use(authMiddleware);

router.get('/status', (req, res) => {
  res.json(tunnelService.status());
});

router.post('/start', async (req, res, next) => {
  const ip = req.clientIp || req.ip || '-';
  try {
    const port = Number(process.env.PORT) || 3000;
    const result = await tunnelService.start(port);
    logger.log('TUNNEL_START', ip, `url=${result.url}`);
    res.json(result);
  } catch (err) {
    logger.log('TUNNEL_START_ERR', ip, `err=${err.message}`);
    next(err);
  }
});

router.post('/stop', (req, res) => {
  const ip = req.clientIp || req.ip || '-';
  tunnelService.stop();
  logger.log('TUNNEL_STOP', ip, '');
  res.status(204).end();
});

module.exports = router;
