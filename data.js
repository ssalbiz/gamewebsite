var server = require('./');
var redis = server.redis.createClient();

exports.init = function() {
  redis.select(server.config.dataDB);
};

function safe(x) {
  return typeof x == 'string' || typeof x == 'number' || typeof x == 'boolean';
}

function serialize(x) {
  if(x == null || x == undefined) throw 'tried to store ' + x + ' in the db' // TODO error
  if(typeof x == 'function') throw 'tried to store a function in the db' // TODO error
  if(typeof x == 'array' || typeof x == 'object') return JSON.stringify(x);
  return x;
}

function redisError(str, e, value) {
  throw {
    // TODO error
    message: str + ' -->\n\te = ' + JSON.stringify(e) + '\n\tvalue = ' + JSON.stringify(value)
  };
}

/* Keys */
exports.get = function(key, callback) {
  if(!safe(key)) throw 'TODO get'; // TODO error
  redis.get(key, function(e, value) {
    if(e) redisError('GET ' + key, e, value);
    else  callback(JSON.parse(value));
  });
};

exports.incr = function(key, callback) {
  if(!safe(key)) throw 'TODO incr'; // TODO error
  redis.incr(key, function(e, value) {
    if(e) redisError('INCR + ' + key, e, value);
    else  callback(value);
  });
}

/* Hashes */
exports.hget = function(hash, field, callback) {
  if(!safe(hash) || !safe(field)) throw 'TODO hget hash=' + hash + ' field=' + field; // TODO error
  redis.hget(hash, field, function(e, value) {
    if(e) redisError('HGET ' + field, e, value);
    else  callback(JSON.parse(value));
  });
};

exports.hset = function(hash, field, value) {
  if(!safe(hash) || !safe(field)) throw 'TODO hset'; // TODO error
  redis.hset(hash, field, serialize(value)); // TODO callback?
};

exports.hmget = function(hash, fields, value, callback) {
  // TODO missing safety checks
  if(typeof fields != 'array') throw 'TODO hmget'; // TODO error
  redis.hmget(hash, fields, function(e, values) {
    if(e) redisError('HMGET ' + field, e, values);
    else  callback(results.map(JSON.parse));
  });
}
