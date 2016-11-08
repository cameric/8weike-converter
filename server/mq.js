/**
 * Service for connecting and publishing to messaging queue
 * Currently RabbitMQ and CloudAMQP are used.
 */

const amqp = require('amqplib');
const oneLineTrim = require('common-tags/lib/oneLineTrim');
const Promise = require('bluebird');

const config = require('./config');

/**
 * Gets a connection from the RabbitMQ server.
 * @returns {Promise.<amqp.Connection>} A promise to return a connection.
 */
function getConnection() {
  return amqp.connect(oneLineTrim`${process.env.CLOUDAMQP_URL}?
    heartbeat=${config.rabbitmq.heartbeat}`).disposer((conn) => {
    conn.close();
  });
}

/**
 * Gets a channel for sending tasks to RabbitMQ with a connection
 * @param conn {Object} - A node amqp connection object
 * @returns {Promise.<amqp.Channel>} A promise to return a channel object.
 */
function getChannel(conn) {
  return conn.createConfirmChannel().disposer((ch) => {
    // TODO(tony): Because of a bug in the implementation of `close`, a TypeError will be thrown
    // every time close is called. Comment this line out until a newer version is released.
    // Check this issue for more details:
    // https://github.com/squaremo/amqp.node/issues/297
    // ch.close();
  });
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
          console.log (`A new task has been processed by worker ${process.pid}: ${msg}`);
          ch.ack(task);
        }
      })
    .error((err) => {
      if (process.env.NODE_ENV === 'development') {
        console.log (`Error when processing with worker ${process.pid}: ${JSON.stringify(err)}`);
      }
    })
  };

  const consume = (ch) => {
    return ch.assertQueue(queue)
        .error(() => Promise.reject(new Promise.OperationalError('Exchange does not exist!')))
        .then(() => {
          ch.prefetch(config.rabbitmq.prefetch);
          return ch.consume(queue, doTask.bind(null, ch), options)
        })
  };

  const consumeFromChannel = (conn) => Promise.using(getChannel(conn), consume);
  return Promise.using(getConnection(), consumeFromChannel);
}

module.exports = {
  getConnection,
  establishConsumer,
};
