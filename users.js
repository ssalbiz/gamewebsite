var server = require('./');

exports.init = function() {
  server.app.get(/^\/user\/([0-9]+)$/, userProfileHandler);
  server.app.post('/user', updateProfileHandler);
};

exports.newUser = function(email, res, req) {
  server.redis.incr('maxuid', function(e, uid) {
    if(e) {
      server.unexpected(res, 'making new user', 'redis failure: INCR maxuid -> e=' + JSON.stringify(e) + ', reply=' + JSON.stringify(uid));
      return;
    } else {
      var user = {
        email: email,
        uid: uid,
        name: ''
      };
      res.writeHead(201, { 'Content-Type': 'application/json' });
      console.log('New user: ' + JSON.stringify(user));
      server.writeDB('user:' + uid, user);
      server.writeDB('uid:' + email, uid);
      req.session.user = user;

      res.end(JSON.stringify({ new: true, user: user}));
    }
  });
};

exports.getUserFromEmail = function(email, callback) {
  server.redis.get('uid:' + email, function(e, uid) {
    if(e) {
      callback({ message: 'redis failure: GET uid:' + email + ' -> e=' + JSON.stringify(e) + ', reply=' + JSON.stringify(uid) }, undefined);
    } else {
      exports.getUserFromUID(uid, callback);
    }
  });
}

exports.getUserFromUID = function(uid, callback) {
  server.redis.get('user:' + uid, function(e, user) {
    if(e) {
      callback({message: 'redis failure: GET user:' + uid + ' --> e=' + JSON.stringify(e) + ' reply=' + JSON.stringify(user) }, undefined);
    } else {
      callback(undefined, JSON.parse(user));
    }
  });
};

function userProfileHandler(req, res) {
  var contents = '';
  var name = '';
  var uid = req.params[0];
  server.users.getUserFromUID(uid, function(e, user) {
    if(e) {
      server.unexpected(res, 'getting user profile', 'failed to get user profile: ' + e.message);
      return;
    } else if(user == null) {
      contents = '<h1>Error</h1><p>Invalid UID please try again</p>'; // TODO should 404
    } else {
      name = user.name;
      contents = '<h1>' + user.name + '</h1><p>Profile goes here</p>';
    }

    server.showPage(req, res, {
      title: name + ' Profile - Foosite',
      contents: contents
    });
  });
}

function updateProfileHandler(req, res) {
  if(typeof req.session.user == 'undefined') {
    res.end('What are you doing?', 400);
    return;
  }

  var name = req.param('name') || req.session.user.name;
  req.session.user.name = name.replace(/[^a-zA-Z0-9\-\_\ ]/g, '').slice(0, 32);
  server.writeDB('user:' + req.session.user.uid, req.session.user);

  res.writeHead(202, { 'Content-Type': 'text/plain' });
  res.end();
}
