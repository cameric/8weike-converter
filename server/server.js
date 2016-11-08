/* The entry point for the converter microservice
 * Hoop up everything and start a cluster of workers.
 */

const cluster = require('cluster');

const config = require('./config');
const imageProcesser = require('./image-process');
const mq = require('./mq');

if (cluster.isMaster) {
  //const numWorkers = require('os').cpus().length;
  const numWorkers = 1;

  if (process.env.NODE_ENV === 'development') {
    console.log('Master cluster setting up ' + numWorkers + ' workers...');
  }

  for (let i = 0; i < numWorkers; ++i) {
    cluster.fork();
  }

  cluster.on('online', function(worker) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Worker ' + worker.process.pid + ' is online');
    }
  });

  cluster.on('exit', function(worker, code, signal) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`);
      console.log('Starting a new worker...');
      cluster.fork();
    }
  });

} else {
  // Establish a consumer channel and start consuming
  mq.establishConsumer(config.rabbitmq.queue, imageProcesser.processMedia)
      .then((ok) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`Consumer established successfully!`);
        }
      })
      .error((err) => {
        console.warn(`Error occurred when starting consumer: ${err}`);
      })
}
