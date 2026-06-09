const notesService = require('../services/notes.service');

function listNotes(req, res, next) {
  try {
    const notes = notesService.getNotes();
    res.json(notes);
  } catch (error) {
    next(error);
  }
}

function createNote(req, res, next) {
  try {
    const note = notesService.createNote(req.body.content);
    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
}

function updateNote(req, res, next) {
  try {
    const note = notesService.updateNote(req.params.id, req.body.content);
    res.json(note);
  } catch (error) {
    next(error);
  }
}

function deleteNote(req, res, next) {
  try {
    notesService.deleteNote(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listNotes,
  createNote,
  updateNote,
  deleteNote
};
