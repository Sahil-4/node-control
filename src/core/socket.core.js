let _io = null;

function init(server) {
  const { Server } = require('socket.io');
  _io = new Server(server, {
    cors: { origin: '*' }
  });
  return _io;
}

function getIo() {
  if (!_io) throw new Error('socket.io not initialised');
  return _io;
}

module.exports = { init, getIo };
