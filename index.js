#!/usr/bin/env node

server = exports;

/* Exported modules (all modules required elsewhere go here) */
server.https            = require('https');
server.redis            = require('redis');
server.SocketIO         = require('socket.io');
server.config           = require('./config');
server.mu               = require('mu2');
server.SocketRedisStore = require('socket.io/lib/stores/redis');

/* Configure express */
var express      = require('express'),
    www          = express(),
    redisExpress = server.redis.createClient(),
    util         = require('util');

redisExpress.select(server.config.sessionDB);

www.use(express.static(__dirname + '/static'));
www.use(express.bodyParser());
www.use(express.cookieParser());
www.use(express.session({
  secret: exports.config.cookieSecret,
  cookie: { httpOnly: false },
  store: new (require('connect-redis')(express))({
    host: server.config.redis.host,
    port: server.config.redis.port,
    client: redisExpress
  })
}));

// TODO not good
exports.unexpected = function(res, action, msg) {
  console.log('Unexpected: ' + action + ': ' + msg);
  res.writeHead(500, { 'Location': '/bad?action=' + encodeURIComponent(action) + '&msg=' + encodeURIComponent(msg) });
  res.end();
};

exports.originAllowed = function(origin) {
  return true; // TODO
};

/* Page rendering */
server.mu.root = __dirname + '/templates';
exports.showPage = function(req, res, options) {
  options.user = req.session.user ? JSON.stringify(req.session.user) : 'null';
  var stream = server.mu.compileAndRender('main.tmpl', options);
  util.pump(stream, res);
};

/* Main routes */
www.get('/', function(req, res) {
  exports.showPage(req, res, {
    title: 'Main page',
    contents: '<div class="hero-unit"><h1>Hello, world!</h1><p>This is the main page. There isnt much here yet!</div>'
  });
});

// TODO error
www.get('/bad', function(req, res) {
  res.writeHead(500, {'Content-Type': 'text/plain'});
  res.end('bad thing happened!');
});

www.get('/special', function(req, res) {
  exports.unexpected(res, 'special sauce', 'lol bad thing');
});

/* Sessions */
exports.session = {};

exports.session.get = function(sessionID, callback) {
  redisExpress.get('sess:' + sessionID, function(e, session) {
    if(e) {
      throw { // TODO
        location: 'server.getSession',
        args: arguments,
        msg: 'GET ' + sessionID + ' failed.'
      };
    }
    callback(JSON.parse(session));
  });
};

exports.session.save = function(sessionID, session, callback) {
  redisExpress.set('sess:' + sessionID, JSON.stringify(session), callback);
}

/* Load components */
server.data = require('./data');
server.auth = require('./auth');
server.users = require('./users');
server.go = require('./games/go/');

server.data.init();
server.auth.init(www);
server.users.init(www);
server.go.init(www);

/* Start server */
www.listen(server.config.port);
console.log('Listening on port ' + server.config.port);
