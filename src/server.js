require('dotenv').config();

const app = require('./app');

const protocol = process.env.PROTOCOL || 'http';
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT) || 3000;

app.listen(port, host, () => {
  console.info(`NodeControl listening at ${protocol}://${host}:${port}`);
});
