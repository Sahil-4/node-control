const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const clipboardService = require('../services/clipboard.service');
const { getIo } = require('../core/socket.core');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  res.json({ text: clipboardService.get() });
});

router.post('/', (req, res) => {
  const text = String(req.body.text || '');
  clipboardService.set(text);
  getIo().emit('clipboard:sync', { text });
  res.json({ text });
});

module.exports = router;
