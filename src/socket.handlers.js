const clipboardService = require('./services/clipboard.service');
const monitorService = require('./services/monitor.service');
const systemService = require('./services/system.service');
const logger = require('./services/logger.service');

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    // Clipboard
    socket.emit('clipboard:sync', { text: clipboardService.get() });

    socket.on('clipboard:update', ({ text }) => {
      clipboardService.set(text);
      socket.broadcast.emit('clipboard:sync', { text });
    });

    // Monitoring
    socket.on('monitor:start', () => {
      socket.emit('monitor:config', { intervalMs: monitorService.intervalMs });
      monitorService.startStream(socket);
    });

    socket.on('monitor:stop', () => {
      monitorService.stopStream(socket);
    });

    socket.on('monitor:refresh', async () => {
      try {
        const stats = await monitorService.getStats();
        socket.emit('monitor:stats', stats);
      } catch {
        // ignore transient errors
      }
    });

    // System command streaming
    socket.on('system:run', ({ action, input }) => {
      const ip = socket.handshake.address || '-';
      logger.log('SYSTEM_RUN', ip, `action=${action} input=${input || ''}`);
      systemService.streamAction(action, input, socket);
    });

    socket.on('disconnect', () => {
      monitorService.stopStream(socket);
    });
  });
}

module.exports = { registerSocketHandlers };
