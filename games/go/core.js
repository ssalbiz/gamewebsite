var server = require('../../');
var ws = new server.WebSocket.server({
  httpServer: server.app,
});

ws.on('request', function(req) {
  if(!server.originAllowed(req.origin)) {
    req.reject();
    return;
  }

  var conn = req.accept('game:go-protocol', req.origin);
  conn.on('message', function(msg) {
    if(msg.type != 'utf8') {
      return;
    }
    conn.sendUTF(msg.utf8Data);
  });

  conn.on('close', function(reason, desc) {
  });

});
