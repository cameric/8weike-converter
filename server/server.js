/* The entry point for the nSERVER
 * Hoop up everything and run the server.
 */

const app = require('./app');
const config = require('./config');
const http = require('http');
const https = require('https');

const listenErrorCallback = (port, err) => {
  if (err) {
    console.error('Listening failed: ', err);
    process.exit(10);
  }
  console.log(`Express server listening on http://localhost:${port}`);
};

const server = http.createServer(app);
server.listen(config.express.http.port,
    listenErrorCallback.bind(null, config.express.http.port));
