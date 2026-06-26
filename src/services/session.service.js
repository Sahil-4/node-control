const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SESSION_ACTIVE_TTL_MS = 30 * 60 * 1000;
const logsDir = path.resolve(__dirname, '..', '..', 'logs');
const sessionsFile = path.join(logsDir, 'sessions.json');
const sessionsLogFile = path.join(logsDir, 'sessions.log');

const _sessions = new Map(); // sha1 key -> session object
let _dirty = false;

function _key(ip, ua) {
  return crypto.createHash('sha1').update(`${ip}|${ua}`).digest('hex');
}

function _save() {
  try {
    const rows = [..._sessions.values()].map(({ _lastLogged, ...s }) => s);
    fs.writeFileSync(sessionsFile, JSON.stringify(rows, null, 2), 'utf8');
    _dirty = false;
  } catch { /* non-fatal */ }
}

function _appendSessionLog(event, info) {
  try {
    let line;
    if (event === 'NEW') {
      const ua = (info.userAgent || '').replace(/"/g, "'");
      line = `[${new Date().toISOString()}] [NEW]    ip=${info.ip} forwarded=${info.forwardedFor || '-'} ua="${ua}" lang=${info.acceptLanguage || '-'}\n`;
    } else {
      line = `[${new Date().toISOString()}] [RETURN] ip=${info.ip} id=${info.id} count=${info.requestCount}\n`;
    }
    fs.appendFileSync(sessionsLogFile, line, 'utf8');
  } catch { /* non-fatal */ }
}

function touch(deviceInfo) {
  const {
    ip = '-',
    forwardedFor = null,
    userAgent = '',
    acceptLanguage = null
  } = deviceInfo || {};

  const key = _key(ip, userAgent);
  const now = Date.now();

  if (_sessions.has(key)) {
    const s = _sessions.get(key);
    s.lastSeen = now;
    s.requestCount++;
    _dirty = true;
    // Rate-limit return-visit log entries to once per minute per session
    if (now - (s._lastLogged || 0) > 60000) {
      s._lastLogged = now;
      _appendSessionLog('RETURN', { ip, id: s.id, requestCount: s.requestCount });
    }
  } else {
    const id = key.slice(0, 8);
    const session = {
      id,
      ip,
      forwardedFor,
      userAgent,
      acceptLanguage,
      firstSeen: now,
      lastSeen: now,
      requestCount: 1,
      _lastLogged: now
    };
    _sessions.set(key, session);
    _appendSessionLog('NEW', { ip, forwardedFor, userAgent, acceptLanguage });
    _save(); // immediate persist for new sessions
  }
}

function list() {
  const cutoff = Date.now() - SESSION_ACTIVE_TTL_MS;
  return [..._sessions.values()]
    .map(({ _lastLogged, ...s }) => ({ ...s, active: s.lastSeen >= cutoff }))
    .sort((a, b) => b.lastSeen - a.lastSeen);
}

function _load() {
  try {
    if (!fs.existsSync(sessionsFile)) return;
    const rows = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
    for (const s of rows) {
      const key = _key(s.ip, s.userAgent);
      _sessions.set(key, { ...s, _lastLogged: 0 });
    }
  } catch { /* corrupt file — start fresh */ }
}

// Periodic save for dirty updates
setInterval(() => { if (_dirty) _save(); }, 60 * 1000).unref();

_load();

module.exports = { touch, list };
