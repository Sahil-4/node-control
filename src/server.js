require('dotenv').config();

const http = require('http');
const app = require('./app');
const { init: initSocket } = require('./core/socket.core');
const { registerSocketHandlers } = require('./socket.handlers');

const protocol = process.env.PROTOCOL || 'http';
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT) || 3000;

const server = http.createServer(app);
const io = initSocket(server);
registerSocketHandlers(io);

server.listen(port, host, () => {
  console.info(`NodeControl listening at ${protocol}://${host}:${port}`);
});
