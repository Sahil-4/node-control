const si = require('systeminformation');

const INTERVAL_MS = Math.min(60000, Math.max(500, parseInt(process.env.MONITOR_INTERVAL_MS, 10) || 2000));
const _timers = new Map();

async function getStats() {
  const [cpuLoad, mem, disk, battery] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.battery()
  ]);

  return {
    cpu: {
      usage: Math.round(cpuLoad.currentLoad)
    },
    ram: {
      used: mem.active,
      total: mem.total
    },
    disk: disk.map(d => ({
      fs: d.fs,
      mount: d.mount,
      used: d.used,
      size: d.size
    })),
    battery: battery.hasBattery ? {
      percent: battery.percent,
      isCharging: battery.isCharging,
      timeRemaining: battery.timeRemaining
    } : null
  };
}

function startStream(socket) {
  if (_timers.has(socket.id)) return;

  async function emit() {
    try {
      const stats = await getStats();
      socket.emit('monitor:stats', stats);
    } catch {
      // silently skip on transient errors
    }
  }

  emit();
  const timer = setInterval(emit, INTERVAL_MS);
  _timers.set(socket.id, timer);
}

function stopStream(socket) {
  const timer = _timers.get(socket.id);
  if (timer) {
    clearInterval(timer);
    _timers.delete(socket.id);
  }
}

module.exports = { getStats, startStream, stopStream, intervalMs: INTERVAL_MS };
