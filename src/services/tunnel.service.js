const { spawn } = require('child_process');

let _proc = null;
let _url = null;
let _startedAt = null;

// cloudflared prints the tunnel URL to stderr
const URL_PATTERN = /https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/;

function status() {
  return {
    running: _proc !== null,
    url: _url,
    startedAt: _startedAt
  };
}

function start(port) {
  return new Promise((resolve, reject) => {
    if (_proc) {
      return resolve(status());
    }

    const proc = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${port}`], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let resolved = false;
    let startupTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error('cloudflared did not produce a tunnel URL within 15 seconds'));
        proc.kill();
      }
    }, 15000);

    function onData(chunk) {
      const text = chunk.toString();
      const match = text.match(URL_PATTERN);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(startupTimer);
        _url = match[0];
        _startedAt = new Date();
        _proc = proc;
        resolve(status());
      }
    }

    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);

    proc.on('exit', () => {
      _proc = null;
      _url = null;
      _startedAt = null;
    });

    proc.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(startupTimer);
        reject(new Error(`Failed to start cloudflared: ${err.message}`));
      }
    });
  });
}

function stop() {
  if (_proc) {
    _proc.kill();
    _proc = null;
    _url = null;
    _startedAt = null;
  }
}

module.exports = { status, start, stop };
