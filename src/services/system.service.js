const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const projectRoot = path.resolve(__dirname, '..', '..');
const uploadsDir = path.join(projectRoot, 'uploads');
const commandTimeoutMs = 5000;

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: commandTimeoutMs, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.log(`error =>`, error)
        const message = stderr?.trim() || stdout?.trim() || error.message;
        const wrapped = new Error(message || 'Command execution failed');
        wrapped.statusCode = 400;
        return reject(wrapped);
      }

      return resolve({
        output: stdout?.trim() || stderr?.trim() || 'Command completed.',
        meta: {}
      });
    });
  });
}

async function runHtopAction() {
  const result = await runCommand("if command -v top >/dev/null 2>&1; then top -b -n 1 | head -n 40; else exit 1; fi");
  return {
    output: result.output,
    meta: { source: 'top' }
  };
}

function resolveSafeDirectory(inputDir) {
  const requested = String(inputDir || '.').trim() || '.';
  if (requested.includes('\0') || requested.includes('..')) {
    const error = new Error('Invalid directory path');
    error.statusCode = 400;
    throw error;
  }

  const safeTarget = path.resolve(projectRoot, requested);
  if (!safeTarget.startsWith(projectRoot)) {
    const error = new Error('Directory is outside the allowed scope');
    error.statusCode = 400;
    throw error;
  }

  if (!fs.existsSync(safeTarget) || !fs.statSync(safeTarget).isDirectory()) {
    const error = new Error('Directory not found');
    error.statusCode = 404;
    throw error;
  }

  return safeTarget;
}

async function runAction(action, input) {
  const allowedAction = String(action || '').trim().toUpperCase();

  switch (allowedAction) {
    case 'HTOP':
      return runHtopAction();
    case 'LS': {
      const safeDir = resolveSafeDirectory(input);
      const result = await runCommand(`ls -la ${shellEscape(safeDir)}`);
      return {
        output: result.output,
        meta: { directory: path.relative(projectRoot, safeDir) || '.' }
      };
    }
    case 'PROCESSES':
      return runCommand('ps aux');
    case 'SCREENSHOT': {
      const filename = `screenshot-${Date.now()}.png`;
      const destination = path.join(uploadsDir, filename);
      const command = `if command -v import >/dev/null 2>&1; then import -window root ${shellEscape(destination)}; elif command -v scrot >/dev/null 2>&1; then scrot ${shellEscape(destination)}; else exit 1; fi`;
      await runCommand(command);
      return {
        output: `Screenshot saved as ${filename}`,
        meta: { file: `/uploads/${encodeURIComponent(filename)}` }
      };
    }
    case 'REBOOT':
      if (String(process.env.ALLOW_REBOOT).toLowerCase() !== 'true') {
        const error = new Error('Reboot is disabled by configuration');
        error.statusCode = 403;
        throw error;
      }

      return runCommand('reboot');
    default: {
      const error = new Error('Unsupported action');
      error.statusCode = 400;
      throw error;
    }
  }
}

module.exports = {
  runAction
};
