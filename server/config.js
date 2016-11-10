// Set the node environment variable if not set from docker config
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const path = require('path');

const root = path.join(__dirname, '/../../');

module.exports = {
  root,
  express: {
    // NOTE: Many public networks (e.g. hotel wifi) block HTTP/HTTPS on nonstandard ports.
    // For production, PORT and PORT_SECURE should always be 80 and 443, respectively.
    http: {
      port: process.env.PORT || 8080,
    },
  },
  rabbitmq: {
    queue: 'image-process-q',
    heartbeat: 60,
    prefetch: 1,
  },
  image: {
    exts: ['.jpg', '.jpeg', '.png', '.webp'],
    thumbnail: 64,
    medium: 400, // Adapt to iPhone 6/6plus
  }
};
