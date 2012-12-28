var server = require('../');

exports.init = function() {
  server.app.get(/^\/go\/creategame\/([0-9]+)$/, createGameHandler);
  server.app.get(/^\/go\/([0-9]+)$/, fetchGameHandler);
};

function createGame(white, black, res) {
  setupPlayer(white);
  setupPlayer(black);
  server.redis.incr('go:maxgid', function(e, gid) {
    if(e) {
      server.unexpected(res, 'creating game', 'could not get a new gid:' + e.message);
    } else {
      server.writeDB('go:game:' + gid, {
        white: white,
        black: black
      });
      res.writeHead(302, {'Location': '/go/' + gid});
      res.end();
    }
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

  server.users.getUserFromUID(uid, function(e, user) {
    if(e) {
      server.unexpected(res, 'create game handler', 'could not get user from uid: ' + e.message);
    } if(user == null) {
      res.writeHead(400, {'Content-Type': 'text/plain'});
      res.end('Bad opponent uid.');
    } else {
      createGame(req.session.user, user, res);
    }
  });
};

function setupPlayer(user) {
  if(typeof user.go == 'undefined') {
    user.go = {
      egf: 0,
      gamesPlayed: 0
    };
    server.writeDB('user:' + user.uid, user);
  }
}
function fetchGameHandler(req, res) {
  var gid = req.params[0];
  server.redis.get('go:game:' + gid, function(e, game) {
    if(e) {
      server.unexpected(res, 'fetching game', e.message);
      return;
    } else if(game == null) {
      server.showPage(req, res, {
        title: 'fuck',
        contents: '<h1>Error</h1><p>Invalid game id</p>'
      });
    } else {
      game = JSON.parse(game);
      server.redis.mget(['user:' + game['uidWhite'], 'user:' + game.uidBlack], function(e, players) {
        if(e) {
          server.unexpected(res, 'fetching game participants', e.message);
        } else {
          var me = req.session.user || { name: '', uid: -1 };
          players[0] = JSON.parse(players[0]);
          players[1] = JSON.parse(players[1]);
          var page = server.mu.compileAndRender('go/game.tmpl', { game: JSON.stringify(game) });

          var contents = ''
          page.on('data', function(data) { contents += data; });
          page.on('end', function() {
            server.showPage(req, res, {
              title: 'Foooo',
              contents: contents
            });
          });
        }
      });
    }
  });
}
