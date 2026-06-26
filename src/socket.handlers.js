const clipboardService = require('./services/clipboard.service');
const monitorService = require('./services/monitor.service');
const systemService = require('./services/system.service');

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
      monitorService.startStream(socket);
    });

    socket.on('monitor:stop', () => {
      monitorService.stopStream(socket);
    });

    // System command streaming
    socket.on('system:run', ({ action, input }) => {
      systemService.streamAction(action, input, socket);
    });

    socket.on('disconnect', () => {
      monitorService.stopStream(socket);
    });
  });
}

module.exports = { registerSocketHandlers };
