var server = require('./');

exports.init = function(www) {
  www.get(/^\/user\/([0-9]+)$/, userProfileHandler);
  www.post('/user', updateProfileHandler);
};

/* Front end */
function userProfileHandler(req, res) {
  var contents = '';
  var uid = req.params[0];
  server.users.get(uid, function(user) {
    if(user == null) {
      contents = '<h1>Error</h1><p>Invalid UID please try again</p>'; // TODO should 404
    } else {
      contents = '<h1>' + user.name + '</h1><p>Profile goes here</p>';
    }

    server.showPage(req, res, {
      title: (user? user.name : '') + ' Profile - Foosite',
      contents: contents
    });
  });
}

function updateProfileHandler(req, res) {
  if(typeof req.session.user == 'undefined') {
    res.end('What are you doing?', 400); // TODO errors
    return;
  }

  var name = req.param('name') || req.session.user.name;
  req.session.user.name = name.replace(/[^a-zA-Z0-9\-\_\ ]/g, '').slice(0, 32);

  server.users.save(req.session.user);

  res.writeHead(202, { 'Content-Type': 'text/plain' });
  res.end();
}

/* Backend */
exports.new = function(email, callback) {
  server.data.incr('maxuid', function(uid) {
    var user = {
      email: email,
      uid: uid,
      name: ''
    };
    console.log('=== new user: ' + email);

    server.users.save(user);
    server.data.hset('UIDs', email, uid);

    callback(user);
  });
};

exports.getFromEmail = function(email, callback) {
  server.data.hget('UIDs', email, function(uid) {
    if(uid == null) callback(null);
    else            server.users.get(uid, callback);
  });
}

exports.get = function(uid, callback) {
  if(typeof uid == 'array') {
    server.data.hmget('users', uid, function(users) { callback(users); });
  } else {
    server.data.hget('users', uid, function(user) { callback(user); });
  }
};

exports.save = function(user) {
  if(!user || !user.uid) throw 'error'; // TODO error
  server.data.hset('users', user.uid, user);
}
