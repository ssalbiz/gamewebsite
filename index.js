#!/usr/bin/env node
var express = require('express');
var http = exports.http = require('http');
var https = exports.https = require('https');
var RedisStore = require('connect-redis')(express);
var util = require('util');
var mu = exports.mu = require('mu2');
var app = exports.app = express();
var config = exports.config = require('./config');

app.use(express.static(__dirname + '/static'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({
  secret: config.cookieSecret,
  cookie: { httpOnly: false },
  store: new RedisStore({
    host: config.redis.host,
    port: config.redis.port,
  })
}));

mu.root = __dirname + '/templates';

exports.writeDB = function(key, val) {
  redis.set(key, JSON.stringify(val)); // TODO callback
}

exports.unexpected = function(res, action, msg) {
  console.log('Unexpected: ' + action + ': ' + msg);
  res.writeHead(500, { 'Location': '/bad?action=' + encodeURIComponent(action) + '&msg=' + encodeURIComponent(msg) });
  res.end();
}

exports.showPage = function(req, res, options) {
  options.user = req.session.user ? JSON.stringify(req.session.user) : 'null';
  var stream = mu.compileAndRender('main.tmpl', options);
  util.pump(stream, res);
}

app.get('/', function(req, res) {
  exports.showPage(req, res, {
    title: 'Main page',
    contents: '<div class="hero-unit"><h1>Hello, world!</h1><p>This is the main page. There isnt much here yet!</div>'
  });
});

app.get('/bad', function(req, res) {
  res.writeHead(500, {'Content-Type': 'text/plain'});
  res.end('bad thing happened!');
});

app.get('/special', function(req, res) {
  exports.unexpected(res, 'special sauce', 'lol bad thing');
});

/* Load components */
exports.auth = require('./auth');
exports.users = require('./users');
exports.go = require('./games/go');

exports.auth.init();
exports.users.init();
exports.go.init();

app.listen(config.port);

console.log('Listening on port ' + config.port);
