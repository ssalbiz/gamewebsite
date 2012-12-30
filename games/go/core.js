var server = require('../../');
var io = server.SocketIO.listen(server.config.go.port);
var redisClient = server.redis.createClient();

exports.init = function() {
  redisClient.select(server.config.go.socketio.sessionDB);
}

io.sockets.on('connection', function(socket) {
  socket.on('auth', handleAuth(socket));
  socket.on('deauth', handleDeauth(socket));
  socket.on('move', handleMove(socket));
  socket.on('disconnect', handleDisconnect(socket));
});

io.configure(function() {
  io.set('log level', server.config.go.socketio.logLevel);
  io.enable('browser client minification'); // why isnt this the default?
  io.set('store', new server.SocketRedisStore({
    redisClient: redisClient
  }));
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

      if((data.role == 'w' && (session == null || uid != game.white.uid)) ||
         (data.role == 'b' && (session == null || uid != game.black.uid))) {
         socket.disconnect('invalid role');
         return;
      }

      socket.emit('authok', {
        board: game.board,
        turn: game.turn
      });

      socket.join('go:game:' + data.gid);

      socket.broadcast.to('go:game:' + data.gid).emit('authnotice', {
        uid: uid? uid : 'anon',
        connected: true
      });
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
