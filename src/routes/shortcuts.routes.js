const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const shortcutsService = require('../services/shortcuts.service');

const router = express.Router();
router.use(authMiddleware);

router.get('/', (req, res) => {
  res.json(shortcutsService.list());
});

router.post('/', (req, res, next) => {
  try {
    const { name, action, input } = req.body;
    if (!name || !action) {
      const err = new Error('name and action are required');
      err.statusCode = 400;
      throw err;
    }
    res.status(201).json(shortcutsService.create({ name, action, input }));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const deleted = shortcutsService.remove(req.params.id);
    if (!deleted) {
      const err = new Error('Shortcut not found');
      err.statusCode = 404;
      throw err;
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
