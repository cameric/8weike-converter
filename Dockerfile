################################################
# Node server (converter service) Docker build #
################################################

# Use latest Node current build
# Note(tonyzhang): We use Node 6.3.1 image
# instead of LTS build (argon) because we need to
# enable ES6 support from Node (95%).
FROM node:wheezy

# Authors
MAINTAINER Tony Zhang <zhzhangtony@gmail.com>

# Set up environment variables inside container
# ONLY write one ENV to keep the layers clean
#
# NOTE(tonyzhang): Any change to this list will be
# applied to ALL three environments (dev, test, prod).
# If you want the environment variable to be applied
# to only one environment (like NODE_ENV), please refer
# to the paper doc "Docker Setup Guide".
ENV AWS_ACCESS_KEY_ID "AKIAJBDITNQWN62JV3LQ"
ENV AWS_SECRET_ACCESS_KEY "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"
ENV CLOUDAMQP_URL "amqp://huozjfuw:qwPVZM1QiUrGS6TnRbqG4UszEVe2LGzj@buck.rmq.cloudamqp.com/huozjfuw"

# Create and move to app directory
RUN mkdir -p /srv/cSERVER
WORKDIR /srv/cSERVER

# Install dependencies
COPY ./server/package.json /srv/cSERVER/
RUN npm install

# Bundle app source inside the image
COPY ./server /srv/cSERVER

CMD [ "npm", "start" ]
EXPOSE 5000
