const express = require('express');

const authMiddleware = require('../middleware/auth.middleware');
const notesController = require('../controllers/notes.controller');

const router = express.Router();

router.use(authMiddleware);
router.get('/', notesController.listNotes);
router.post('/', notesController.createNote);
router.put('/:id', notesController.updateNote);
router.delete('/:id', notesController.deleteNote);

module.exports = router;
