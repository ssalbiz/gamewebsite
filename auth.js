var server = require('./');

exports.init = function(www) {
  www.post('/auth/login', loginHandler);
  www.post('/auth/logout', logoutHandler);
};

function loginHandler(req, res) {
  var data = JSON.stringify({
    'assertion': req.param('assertion', null),
    'audience': server.config.host + ':' + server.config.port,
  });

  var options = {
    host: 'verifier.login.persona.org',
    path: '/verify',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  var req2 = server.https.request(options, function(res2) {
    res2.setEncoding('utf8');
    var data = '';
    res2.on('data', function (chunk) { data += chunk; });
    res2.on('end', function() {
      data = JSON.parse(data);

      if(data.status !== 'okay') {
        // TODO error
        server.unexpected(res, 'verifying with persona', JSON.stringify(data));
        return;
      }

      server.users.getFromEmail(data.email, function(user) {
        if(!user) {
          server.users.new(data.email, function(user) {
            res.writeHead(201, { 'Content-Type': 'application/json' });
            req.session.user = user; // cache in session for convenience
            res.end(JSON.stringify({ new: true, user: user}));
          });
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          req.session.user = user; // cache it in session for convenience
          res.end(JSON.stringify(user));
        }
      });
    });
  });

  // TODO error
  req2.on('error', function(e) { server.unexpected(res, 'contacting persona', JSON.stringify(e)); });

  req2.write(data);
  req2.end();
}

function logoutHandler(req, res) {
  req.session.destroy();
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('bye');
}
