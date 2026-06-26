const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..', '..');
const uploadsDir = path.join(projectRoot, 'uploads');
const DEFAULT_EXPIRES_MS = 60 * 60 * 1000; // 1 hour

const tokens = new Map();

function createToken(filename, expiresInMs) {
  const duration = Number(expiresInMs) > 0 ? Number(expiresInMs) : DEFAULT_EXPIRES_MS;
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + duration);

  const timer = setTimeout(() => tokens.delete(token), duration);
  // Allow process to exit without waiting for timer
  if (timer.unref) timer.unref();

  tokens.set(token, { filename, expiresAt });
  return { token, expiresAt };
}

function resolveToken(token) {
  const entry = tokens.get(token);
  if (!entry) return null;
  if (new Date() > entry.expiresAt) {
    tokens.delete(token);
    return null;
  }
  tokens.delete(token); // one-time use
  return entry.filename;
}

function getFilePath(filename) {
  const decoded = decodeURIComponent(filename);
  const resolved = path.resolve(uploadsDir, path.basename(decoded));
  if (!resolved.startsWith(uploadsDir)) return null;
  if (!fs.existsSync(resolved)) return null;
  return resolved;
}

module.exports = { createToken, resolveToken, getFilePath };
