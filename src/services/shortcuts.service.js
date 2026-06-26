const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDir = path.join(__dirname, '..', 'data');
const shortcutsFile = path.join(dataDir, 'shortcuts.json');

function read() {
  if (!fs.existsSync(shortcutsFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(shortcutsFile, 'utf8'));
  } catch {
    return [];
  }
}

function write(shortcuts) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(shortcutsFile, JSON.stringify(shortcuts, null, 2), 'utf8');
}

function list() {
  return read();
}

function create({ name, action, input }) {
  const shortcuts = read();
  const entry = { id: crypto.randomUUID(), name: String(name), action: String(action), input: String(input || '') };
  shortcuts.push(entry);
  write(shortcuts);
  return entry;
}

function remove(id) {
  const shortcuts = read();
  const next = shortcuts.filter(s => s.id !== id);
  if (next.length === shortcuts.length) return false;
  write(next);
  return true;
}

module.exports = { list, create, remove };
