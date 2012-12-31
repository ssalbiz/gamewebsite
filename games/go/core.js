var server = require('../../');
var io = server.SocketIO.listen(server.config.go.port);

exports.init = function() {
  var redisClient = server.redis.createClient();
  redisClient.select(server.config.go.socketio.sessionDB);
  io.configure(function() {
    io.set('log level', server.config.go.socketio.logLevel);
    io.enable('browser client minification'); // why isnt this the default?
    io.set('store', new server.SocketRedisStore({
      redisClient: redisClient
    }));
  });
}

io.sockets.on('connection', function(socket) {
  socket.on('auth', handleAuth(socket));
  socket.on('deauth', handleDeauth(socket));
  socket.on('move', handleMove(socket));
  socket.on('disconnect', handleDisconnect(socket));
});


function handleDisconnect(socket) { return function(data) {
  socket.get('gid', function(e, gid) {
    socket.get('uid', function(e, uid) {
      sendAuthNotice(socket, gid, uid, false);
    });
  });
};}

function sendAuthNotice(socket, gid, uid, connected) {
  if(typeof gid == 'undefined' || gid == null) return;
  socket.broadcast.to('go:game:' + gid).emit('authnotice', {
    uid: uid? uid : 'anon',
    connected: connected
  });
}

function handleDeauth(socket) { return function(data) {
  socket.set('cookie', undefined);
};}

function handleAuth(socket) { return function(data) {
  data.cookie = data.cookie || null;
  data.role = data.role || 's';

  if(typeof data.gid == 'undefined') {
    socket.disconnect('missing gid');
    return;
  }

  socket.set('gid', data.gid);

  server.session.get(data.cookie, function(session) {
    var uid = null;
    if(session) {
      socket.set('cookie', data.cookie);
      if(session.user) {
        uid = session.user.uid;
        socket.set('uid', uid);
      }
    }

    server.go.game.get(data.gid, function(game) {
      if(game == null) {
        socket.disconnect('bad gid during auth');
        return;
      }

      socket.emit('authok', { game: game });

      socket.join('go:game:' + data.gid);

      sendAuthNotice(socket, data.gid, uid, true);
    });
  });
};}

function handleMove(socket) { return function(data) {
  socket.get('cookie', function(e, cookie) {
    if(e || cookie == null) {
      socket.emit('badreq', 'not authorized to make moves');
      return;
    }
    socket.get('gid', function(e, gid) {
      if(e || typeof gid != 'string') {
        socket.disconnect('socket is missing gid - what?');
        return;
      }

      server.go.game.get(gid, function(game) {
        if(!game) {
          socket.disconnect('game was null - what?');
          return;
        }
        game.board[19*data.r + data.c] = data.role; // TODO lol
        game.turn = data.role == 'w' ? 'b': 'w'; // TODO lolx2
        server.go.game.save(game);
        socket.broadcast.to('go:game:' + gid).emit('move', data);
      });
    });
  });
};}

function expectedScore(rk1, rk2) {
  // it is weird how his system doesn't sum expectation to 1, but shrug?
  if(rk1 - rk2 >= 390)      return 1.0;
  else if(rk2 - rk1 >= 460) return 0.0;
  else                      return (rk1 - rk2 + 460)/850;
}

function updatePlayer(user, opponentRank, score) {
  if(user.go.played < 4) {
    var sofar = user.go.rank*user.go.played + opponentRank;
    if(score == 1.0)      sofar += 200;
    else if(score == 0.0) sofar -= 200;
    users.go.rank = sofar/(user.go.played + 1);
  } else {
    var K = 24.0;
    var expected = expectedScore(users.white.rank, opponentRank);
    user.go.rank += K*(score - expected);
  }

  users.go.played += 1;
  users.go.won += score == 1.0;
  users.go.tied += score == 0.5;
  users.go.lost += score == 0.0;

  server.users.save(user);
}

function finishGame(game, callback) {
  var results = server.go.engine.score(game);

  var bRank = game.black.go.rank;
  var wRank = game.white.go.rank;
  updatePlayer(game.white, bRank, results.wScore);
  updatePlayer(game.black, wRank, results.bScore);

  game.results = results;
  callback(game);
}
