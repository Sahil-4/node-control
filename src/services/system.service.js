const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const { logsDir } = require('./logger.service');

const projectRoot = process.env.ALLOWED_SCOPE
  ? path.resolve(process.env.ALLOWED_SCOPE)
  : path.resolve(__dirname, '..', '..');
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

function buildCommand(action, input) {
  const allowedAction = String(action || '').trim().toUpperCase();
  switch (allowedAction) {
    case 'HTOP':
      return "if command -v top >/dev/null 2>&1; then top -b -n 1 | head -n 40; else exit 1; fi";
    case 'LS': {
      const safeDir = resolveSafeDirectory(input);
      return `ls -la ${shellEscape(safeDir)}`;
    }
    case 'PROCESSES':
      return 'ps aux';
    case 'SCREENSHOT': {
      const filename = `screenshot-${Date.now()}.png`;
      const destination = path.join(uploadsDir, filename);
      return `if command -v import >/dev/null 2>&1; then import -window root ${shellEscape(destination)}; elif command -v scrot >/dev/null 2>&1; then scrot ${shellEscape(destination)}; else exit 1; fi`;
    }
    case 'REBOOT':
      if (String(process.env.ALLOW_REBOOT).toLowerCase() !== 'true') {
        const error = new Error('Reboot is disabled by configuration');
        error.statusCode = 403;
        throw error;
      }
      return 'reboot';
    default: {
      const error = new Error('Unsupported action');
      error.statusCode = 400;
      throw error;
    }
  }
}

function streamAction(action, input, socket) {
  let command;
  try {
    command = buildCommand(action, input);
  } catch (err) {
    socket.emit('system:error', { message: err.message });
    return;
  }

  const proc = spawn('sh', ['-c', command]);
  let killed = false;

  const killTimer = setTimeout(() => {
    killed = true;
    proc.kill();
    socket.emit('system:error', { message: 'Command timed out' });
  }, commandTimeoutMs);

  proc.stdout.on('data', (chunk) => socket.emit('system:output', { chunk: chunk.toString() }));
  proc.stderr.on('data', (chunk) => socket.emit('system:output', { chunk: chunk.toString() }));

  proc.on('close', (code) => {
    clearTimeout(killTimer);
    if (!killed) {
      socket.emit('system:done', { exitCode: code });
    }
  });

  proc.on('error', (err) => {
    clearTimeout(killTimer);
    socket.emit('system:error', { message: err.message });
  });
}

const TEXT_EXTENSIONS = new Set([
  'txt','md','json','js','ts','jsx','tsx','css','html','htm','xml','yaml','yml',
  'sh','bash','env','example','ini','toml','csv','log','conf','config','gitignore',
  'dockerfile','makefile','py','rb','go','rs','java','c','cpp','h','hpp','sql'
]);
const MAX_READ_BYTES = 512 * 1024; // 512 KB

// File guard: block sensitive filenames. Disable by setting FILE_GUARD=false in env.
const FILE_GUARD_ENABLED = String(process.env.FILE_GUARD).toLowerCase() !== 'false';
const GUARD_BLOCKED_KEYWORDS = [
  'passwd', 'shadow', 'sudoers',
  'secret', 'credential',
  'config',
  'private_key', 'id_rsa', 'id_dsa', 'id_ecdsa', 'id_ed25519'
];
const GUARD_BLOCKED_EXTENSIONS = new Set(['key', 'pem', 'p12', 'pfx', 'crt', 'cer', 'cert']);

function isBlockedByGuard(resolvedPath) {
  if (!FILE_GUARD_ENABLED) return false;
  const base = path.basename(resolvedPath).toLowerCase();
  const ext = path.extname(base).slice(1);
  if (GUARD_BLOCKED_EXTENSIONS.has(ext)) return true;
  if (base.startsWith('.env')) return true;
  if (GUARD_BLOCKED_KEYWORDS.some(kw => base.includes(kw))) return true;
  return false;
}

function getAllowedScope() {
  return projectRoot;
}

function readScopedFile(inputPath) {
  if (!inputPath) {
    const err = new Error('path is required');
    err.statusCode = 400;
    throw err;
  }

  const requested = String(inputPath).trim();
  if (requested.includes('\0')) {
    const err = new Error('Invalid path');
    err.statusCode = 400;
    throw err;
  }

  const resolved = path.resolve(projectRoot, requested);
  if (!resolved.startsWith(projectRoot + path.sep) && resolved !== projectRoot) {
    const err = new Error('Path is outside the allowed scope');
    err.statusCode = 403;
    throw err;
  }

  if (resolved === logsDir || resolved.startsWith(logsDir + path.sep)) {
    const err = new Error('Access to this path is not permitted');
    err.statusCode = 403;
    throw err;
  }

  if (isBlockedByGuard(resolved)) {
    const err = new Error('Access to this path is restricted by file guard');
    err.statusCode = 403;
    throw err;
  }

  if (!fs.existsSync(resolved)) {
    const err = new Error('File not found');
    err.statusCode = 404;
    throw err;
  }

  const stat = fs.statSync(resolved); // follows symlinks
  if (stat.isDirectory()) {
    const entries = fs.readdirSync(resolved);
    const lines = entries.map(name => {
      const entryFull = path.join(resolved, name);
      try {
        const lst = fs.lstatSync(entryFull);
        if (lst.isSymbolicLink()) {
          const target = fs.readlinkSync(entryFull);
          const targetStat = fs.statSync(entryFull);
          return `${name} -> ${target}  [${targetStat.isDirectory() ? 'dir' : 'file'}]`;
        }
        return `${name}${lst.isDirectory() ? '/' : ''}`;
      } catch {
        return `${name}  [unreadable]`;
      }
    });
    return {
      path: path.relative(projectRoot, resolved),
      content: lines.join('\n') || '(empty)',
      size: 0,
      ext: 'txt',
      isDirectory: true
    };
  }
  if (!stat.isFile()) {
    const err = new Error('Path is not a file');
    err.statusCode = 400;
    throw err;
  }

  if (stat.size > MAX_READ_BYTES) {
    const err = new Error(`File too large to preview (max ${MAX_READ_BYTES / 1024} KB)`);
    err.statusCode = 413;
    throw err;
  }

  const ext = path.extname(resolved).replace('.', '').toLowerCase();
  const basename = path.basename(resolved).toLowerCase();
  const isText = TEXT_EXTENSIONS.has(ext) || TEXT_EXTENSIONS.has(basename);

  if (!isText) {
    const err = new Error('File type cannot be previewed as text');
    err.statusCode = 415;
    throw err;
  }

  const content = fs.readFileSync(resolved, 'utf8');
  return {
    path: path.relative(projectRoot, resolved),
    content,
    size: stat.size,
    ext: ext || 'txt'
  };
}

module.exports = {
  runAction,
  streamAction,
  readScopedFile,
  getAllowedScope
};
