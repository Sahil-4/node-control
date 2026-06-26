const express = require('express');
const path = require('path');
const authMiddleware = require('../middleware/auth.middleware');
const shareService = require('../services/share.service');

const router = express.Router();

// Create a share token — requires auth
router.post('/', authMiddleware, (req, res, next) => {
  try {
    const { filename, expiresIn } = req.body;
    if (!filename) {
      const err = new Error('filename is required');
      err.statusCode = 400;
      throw err;
    }

    const filePath = shareService.getFilePath(filename);
    if (!filePath) {
      const err = new Error('File not found');
      err.statusCode = 404;
      throw err;
    }

    const { token, expiresAt } = shareService.createToken(filename, expiresIn);
    const url = `/api/share/${token}`;
    res.json({ url, expiresAt });
  } catch (err) {
    next(err);
  }
});

// Consume a share token — no auth required
router.get('/:token', (req, res, next) => {
  try {
    const filename = shareService.resolveToken(req.params.token);
    if (!filename) {
      const err = new Error('Share link is invalid or has expired');
      err.statusCode = 410;
      throw err;
    }

    const filePath = shareService.getFilePath(filename);
    if (!filePath) {
      const err = new Error('File not found');
      err.statusCode = 404;
      throw err;
    }

    res.download(filePath, path.basename(decodeURIComponent(filename)));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
