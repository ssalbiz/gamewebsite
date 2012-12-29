var server = require('../../');

var io = server.SocketIO.listen(server.config.go.port);

io.sockets.on('connection', function(socket) {
  socket.on('auth', handleAuth(socket));
  socket.on('deauth', handleDeauth(socket));
  socket.on('move', handleMove(socket));
});

function handleDeauth(socket) { return function(data) {
  socket.set('cookie', undefined);
};}

function handleAuth(socket) { return function(data) {
  console.log('auth request: ' + JSON.stringify(data));
  data.cookie = data.cookie || null;
  data.role = data.role || 's';
  if(typeof data.gid == 'undefined') {
    socket.disconnect('missing gid');
    return;
  }

  server.redis.mget(['sess:' + data.cookie, 'go:game:' + data.gid], function(e, results) {
    if(e) {
      socket.emit('unexpected', 'auth failure: redis GET sess:' + data.cookie + ' --> e=' + e + ', reply=' + results);
    } else if(results[1] == null) {
      socket.disconnect('no such gid');
    } else {
      var session = results[0] == null ? null : JSON.parse(results[0]);
      var game = JSON.parse(results[1]);
      if((data.role == 'w' && (session == null || game.white.uid != session.user.uid)) ||
         (data.role == 'b' && (session == null || game.black.uid != session.user.uid))) {
         socket.disconnect('invalid role');
      }

      if(session) socket.set('cookie', data.cookie);
      socket.emit('authok', {
        board: game.board,
        turn: game.turn
      });
      socket.join('go:game:' + data.gid);
      socket.set('gid', data.gid);
    }
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
      } else {
        server.redis.get('go:game:' + gid, function(e, game) {
          if(e) {
            socket.disconnect('couldn;t get game - what?');
          } else if(game == null) {
            socket.disconnect('game was null - what?');
          } else {
            game = JSON.parse(game);
            game.board[19*data.r + data.c] = data.role; // TODO lol
            game.turn = data.role == 'w' ? 'b': 'w'; // TODO lolx2
            server.writeDB('go:game:' + gid, game);
            socket.broadcast.to('go:game:' + gid).emit('move', data);
          }
        });
      }
    });
  });
};}
