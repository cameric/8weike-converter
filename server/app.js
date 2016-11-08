const bodyParser = require('body-parser');
const config = require('./config');
const express = require('express');
const path = require('path');

const app = express();

app.use(express.static(path.join(config.root, '/public')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

module.exports = app;
