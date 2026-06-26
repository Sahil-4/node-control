const fs = require('fs');
const path = require('path');

const logsDir = path.resolve(__dirname, '..', '..', 'logs');
const logFile = path.join(logsDir, 'actions.log');

function log(action, ip, detail = '') {
  const line = `[${new Date().toISOString()}] [${action}] [${ip || '-'}] ${detail}\n`;
  try {
    fs.appendFileSync(logFile, line, 'utf8');
  } catch {
    // non-fatal: directory may not exist on first boot before ensureStorage runs
  }
}

module.exports = { log, logsDir };
