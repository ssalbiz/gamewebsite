/*
    Purpose: the http component of the Go game
 */

var server = require('../../');
var core = require('./core').init();

exports.init = function(www) {
  www.get(/^\/go\/creategame\/([0-9]+)$/, createGameHandler);
  www.get(/^\/go\/([0-9]+)$/, fetchGameHandler);
};

/* Front end */

function createGameHandler(req, res) {
  if(typeof req.session.user == 'undefined') {
    res.end('You are not logged in');
    return;
  }

  var uid = req.params[0];
  if(uid == req.session.user.uid) {
    res.writeHead(400, {'Content-Type': 'text/plain'});
    res.end('Cant make game against self.');
    return;
  }

  server.users.get(uid, function(user) {
    if(user == null) {
      res.writeHead(400, {'Content-Type': 'text/plain'});
      res.end('Bad opponent uid.');
      return;
    }

    server.go.game.new(req.session.user, user, function(game) {
      res.writeHead(302, {'Location': '/go/' + game.gid});
      res.end();
    });
  });
};

function fetchGameHandler(req, res) {
  var gid = req.params[0];
  server.go.game.get(gid, function(game) {
    if(game == null) {
      server.showPage(req, res, {
        title: 'fuck',
        contents: '<h1>Error</h1><p>Invalid game id</p>'
      });
      return;
    }

    var me = req.session.user || { name: '', uid: -1 };
    var page = server.mu.compileAndRender('go/game.tmpl', {
      socketHost: 'http://' + server.config.host + ':' + server.config.go.port,
      game: JSON.stringify(game)
    });

    var contents = '';
    page.on('data', function(data) { contents += data; });
    page.on('end', function() {
      server.showPage(req, res, {
        title: 'Go: ' + game.white.name + ' vs. ' + game.black.name,
        contents: contents
      });
    });

  });
}

/* Back end */
function setupPlayer(user) {
  if(typeof user.go == 'undefined') {
    user.go = {
      egf: 0,
      gamesPlayed: 0
    };
    server.users.save(user);
  }
}

exports.game = {};
exports.game.new = function(white, black, callback) {
  setupPlayer(white);
  setupPlayer(black);
  server.data.incr('go:maxgid', function(gid) {
    var game = {
      gid: gid,
      white: white,
      black: black,
      board: new Array(19*19 + 1).join(' ').split(''),
      turn: 'b',
    };
    server.data.hset('go:games', gid, game);
    callback(game);
  });
};

exports.game.get = function(gid, callback) {
  server.data.hget('go:games', gid, callback);
};

exports.game.save = function(game) {
  server.data.hset('go:games', game.gid, game);
};
