const path = require('path');

const { readJSON, writeJSON } = require('../core/file.core');

const notesPath = path.join(__dirname, '..', 'data', 'notes.json');

function getNotes() {
  const notes = readJSON(notesPath);
  return Array.isArray(notes) ? notes.sort((a, b) => b.id - a.id) : [];
}

function createNote(content) {
  const trimmed = String(content || '').trim();
  if (!trimmed) {
    const error = new Error('Note content is required');
    error.statusCode = 400;
    throw error;
  }

  const notes = getNotes();
  const nextId = notes.length ? Math.max(...notes.map((note) => note.id)) + 1 : 1;
  const note = {
    id: nextId,
    content: trimmed,
    createdAt: new Date().toISOString()
  };

  notes.unshift(note);
  writeJSON(notesPath, notes);
  return note;
}

function updateNote(id, content) {
  const trimmed = String(content || '').trim();
  if (!trimmed) {
    const error = new Error('Note content is required');
    error.statusCode = 400;
    throw error;
  }

  const notes = getNotes();
  const index = notes.findIndex((note) => note.id === Number(id));
  if (index === -1) {
    const error = new Error('Note not found');
    error.statusCode = 404;
    throw error;
  }

  notes[index].content = trimmed;
  writeJSON(notesPath, notes);
  return notes[index];
}

function deleteNote(id) {
  const notes = getNotes();
  const filtered = notes.filter((note) => note.id !== Number(id));
  if (filtered.length === notes.length) {
    const error = new Error('Note not found');
    error.statusCode = 404;
    throw error;
  }

  writeJSON(notesPath, filtered);
}

module.exports = {
  getNotes,
  createNote,
  updateNote,
  deleteNote
};
