var server = require('./');

exports.init = function() {
  server.app.post('/auth/login', loginHandler);
  server.app.post('/auth/logout', logoutHandler);
};

function loginHandler(req, res) {
  var data = JSON.stringify({
    'assertion': req.param('assertion', null),
    'audience': 'csc.uwaterloo.ca:12345'
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
      try {
        data = JSON.parse(data);
      } catch(e) {
        server.unexpected(res, 'parsing post data', JSON.stringify(e));
        return;
      }

      if(data.status !== 'okay' || typeof data.email == 'undefined') {
        server.unexpected(res, 'verifying with persona', JSON.stringify(data));
        return;
      }

      var email = data.email;

      server.users.getUserFromEmail(email, function(e, user) {
        if(e) {
          server.unexpected(res, 'getting uid for email', JSON.stringify(e));
        } else if(user == null && typeof email != 'undefined') {
          server.users.newUser(email, res, req);
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          req.session.user = user;
          res.end(JSON.stringify(user));
        }
      });
    });
  });

  req2.on('error', function(e) { server.unexpected(res, 'contacting persona', JSON.stringify(e)); });

  req2.write(data);
  req2.end();
}

function logoutHandler(req, res) {
  req.session.destroy();
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('bye');
}
