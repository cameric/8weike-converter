/**
 * Service for connecting and publishing to messaging queue
 * Currently RabbitMQ and CloudAMQP are used.
 */

const amqp = require('amqplib');
const oneLineTrim = require('common-tags/lib/oneLineTrim');

const config = require('./config');

/**
 * Gets a connection from the RabbitMQ server.
 * @returns {Promise.<amqp.Connection>} A promise to return a connection.
 */
function getConnection() {
  return amqp.connect(oneLineTrim`${process.env.CLOUDAMQP_URL}?
    heartbeat=${config.rabbitmq.heartbeat}`);
}

/**
 * Establish a consumer and call worker routine with the consumer
 * @param queue - the queue to get messages from
 * @param worker - the worker routine that will be triggered
 * @param options - options that will be sent into consume function
 * @returns {*}
 */
function establishConsumer(queue, worker, options = {}) {
  // Run the task with worker process and ack it once finished
  const doTask = (ch, task) => {
    worker(task)
      .then((msg) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`A new task has been processed by worker ${process.pid}: ${msg}`);
        }
        ch.ack(task);
      })
      .error((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Error when processing with worker ${process.pid}: ${JSON.stringify(err)}`);
        }
      })
      .catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn(err);
        }
      })
  };

  const consume = (ch) => {
    return ch.assertQueue(queue)
        .error(() => {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Exchange does not exist!');
          }
        })
        .then(() => {
          ch.prefetch(config.rabbitmq.prefetch);
          ch.consume(queue, doTask.bind(null, ch), options);
          return null;
        })
  };

  const consumeFromChannel = (conn) => conn.createConfirmChannel().then(consume);
  getConnection()
      .then(consumeFromChannel)
      .catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Error when consuming task: ${err}`);
        }
      });
}

module.exports = {
  getConnection,
  establishConsumer,
};
