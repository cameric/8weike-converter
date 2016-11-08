const bodyParser = require('body-parser');
const config = require('./config');
const express = require('express');
const path = require('path');

const app = express();

app.use(express.static(path.join(config.root, '/public')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.status(200).send('Converter service running...');
});

module.exports = app;
