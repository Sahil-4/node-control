const express = require('express');
const fs = require('fs');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const notesRoutes = require('./routes/notes.routes');
const filesRoutes = require('./routes/files.routes');
const systemRoutes = require('./routes/system.routes');
const clipboardRoutes = require('./routes/clipboard.routes');
const shareRoutes = require('./routes/share.routes');
const shortcutsRoutes = require('./routes/shortcuts.routes');
const tunnelRoutes = require('./routes/tunnel.routes');
const sessionsRoutes = require('./routes/sessions.routes');

const app = express();
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(__dirname, 'data');
const notesFile = path.join(dataDir, 'notes.json');
const uploadsDir = path.join(rootDir, 'uploads');
const scopeDir = path.join(rootDir, 'scope');
const logsDir = path.join(rootDir, 'logs');

function ensureStorage() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  if (!fs.existsSync(scopeDir)) {
    fs.mkdirSync(scopeDir, { recursive: true });
  }

  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  if (!fs.existsSync(notesFile)) {
    fs.writeFileSync(notesFile, '[]', 'utf8');
  }
}

ensureStorage();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(rootDir, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/clipboard', clipboardRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/system/shortcuts', shortcutsRoutes);
app.use('/api/tunnel', tunnelRoutes);
app.use('/api/sessions', sessionsRoutes);

const VALID_PAGES = new Set(['monitor', 'notes', 'files', 'system', 'clipboard']);
const landingPage = VALID_PAGES.has(process.env.LANDING_PAGE) ? process.env.LANDING_PAGE : 'monitor';

app.get('/api/config', (_req, res) => {
  res.json({ landingPage: `${landingPage}.html` });
});

app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, _req, res, _next) => {
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal server error'
  });
});

module.exports = app;
