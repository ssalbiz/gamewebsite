/*
    Purpose: the http component of the Go game
 */

var server = require('../../');
var core = require('./core').init();

exports.engine = require('./engine').engineInit();

exports.init = function(www) {
  www.get(/^\/go\/creategame\/([0-9]+)$/, createGameHandler);
  www.get(/^\/go\/([0-9]+)$/, fetchGameHandler);
  www.post(/^\/go\/match(\/)?$/, gameMatchingHandler);
  www.get(/^\/go(\/)?$/, gameLobbyHandler);
};

/* Front end */

function gameMatchingHandler(req, res) {
  if(typeof req.session.user == 'undefined') {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('You are not logged in');
    return;
  }
  server.go.match.pending(function(matches) {
    // NOTE to future self: there are concurrency difficulties here that will
    //                      need to be sorted out later.
    if(+req.body.matchid == -1) {
      if(matches) {
        for (var i in matches) {
          if (!matches.hasOwnProperty(i)) continue;
          //TODO: game constraint checking
          if(matches[i].taken || matches[i].player == req.session.user.uid) continue;
          // pull out of queue.
          matches[i].taken = true;
          server.go.match.update(matches[i].matchid, matches[i]);
          //make game
          server.users.get(matches[i].player, function(user) {
            if (user != null) {
              server.go.game.new(req.session.user, user, function(game) {
                matches[i].gid = game.gid;
                // success!
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(matches[i]));
                server.go.match.update(matches[i].matchid, matches[i]);
              });
            } else {
              // bad uid in the match record.
              server.match.drop(matches[i].matchid);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(matches[i]));
            }
          });
          return;
        }
      }
      // nothing in the queue, so create a new pending match record.
      server.go.match.new(req.session.user.uid, function(match) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(match));
      });
      return;
    } else {
      console.log('--- checking for match on: ' + req.body.matchid);
      server.go.match.get(req.body.matchid, function(match) {
        if (match == null) {
          // client will poll for a fresh match next time.
          match = { matchid: -1 };
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(match));
      });
    }
  });
};

function gameLobbyHandler(req, res) {
  var page = server.mu.compileAndRender('go/lobby.tmpl');
  var contents = ''
  page.on('data', function(data) { contents += data; });
  page.on('end', function() {
      server.showPage(req, res, {
      title: 'Lobby',
      contents: contents
    });
  });
}

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
      rank: 0,
      played: 0,
      won: 0,
      tied: 0,
      lost: 0
    };
    server.users.save(user);
  }
}

exports.game = {};
exports.game.new = function(white, black, callback) {
  setupPlayer(white);
  setupPlayer(black);
  server.data.incr('go:maxgid', function(gid) {
    var game = server.go.engine.newGame();
    game.gid = gid;
    game.white = white;
    game.black = black;
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

exports.match = {};
exports.match.new = function(uid, callback) {
  server.data.incr('go:maxmatchid', function(matchid) {
    var match = {
      matchid: matchid,
      player: uid,
      gid: null,
    };
    server.data.hset('go:matches', matchid, match);
    callback(match);
  });
};

exports.match.get = function(matchid, callback) {
  server.data.hget('go:matches', matchid, callback);
};

exports.match.update = function(matchid, match) {
  server.data.hset('go:matches', matchid, match);
};

exports.match.pending = function(callback) {
  server.data.hgetall('go:matches', callback);
};

exports.match.drop = function(matchid) {
  server.data.hdel('go:matches', matchid);
};
