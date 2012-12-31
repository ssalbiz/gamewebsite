/*
 * Implementation of Go rules that is shared between the client and server
 */

var engine = {};

engine.score = function(game) {
  return {
    wScore: 1.0,
    bScore: 1.0 - wScore
  };
};

engine.newGame = function() {
  var game = {
    board: [],
    emptyPieces: [],
    chains: {},
    turn: 'b',
  };
  for(var i = 0; i < 19*19; i++) {
    game.board.push(' ');
    game.emptyPieces.push(i);
  }
  return game;
};

engine.verifyMove = function(game, move) {
  if(move.role != 'w' && move.role != 'b') {
    console.log('* disallowed move due to bad role');
    return false;
  }

  // make sure space is valid and empty
  if(engine.getPiece(game, move.r, move.c) != ' ') {
    console.log('* disallowed move due to invalid location');
    return false;
  }

  if(engine.suicideCheck(game, move)) {
    console.log('* disallowed suicide move');
    return false;
  }

  console.log('* move permitted');
  return true;
};

// returns true if this move would suicide
engine.suicideCheck = function(game, move) {
  var N = getNeighbours(toIndex(move.r, move.c));
  var NP = N.map(function(x) { return engine.getPieceByIndex(game, x); });

  console.log(N);
  console.log(NP);
  for(var i = 0; i < N.length; i++) {
    if(NP[i] == ' ') {
      return false;
    } if(NP[i] == null) {
    } else if(NP[i] == move.role) {
      var numLiberties = getLiberties(game.chains, find(game.chains, N[i])).length;
      console.log(getLiberties(game.chains, find(game.chains, N[i])));
      if(numLiberties > 1) return false;
    } else {
      var numLiberties = getLiberties(game.chains, find(game.chains, N[i])).length;
      if(numLiberties == 1) return false;
    }

  }

  return true;
};

engine.evalMove = function(game, move) {
  var index = toIndex(move.r, move.c);
  var rep = index;

  var N = getNeighbours(index);
  var NP = N.map(function(x) { return engine.getPieceByIndex(game, x); });
  var NR = [null, null, null, null];

  console.log('=====================================');
  console.log(' a move of ' + move.role + ' at ' + move.r + ', ' + move.c + ' (index = ' + index + ')');

  var libs = [];
  console.log('= getting liberties of ' + index);
  for(var i = 0; i < N.length; i++) {
    if(engine.getPieceByIndex(game, N[i]) == ' ') libs.push(N[i]);
  }

  // add piece to the board
  var idx = game.emptyPieces.indexOf(N[i]);
  console.log('= removing piece from emptyPieces');
  game.emptyPieces.slice(idx, 1); // remove it from emptyPieces
  console.log('= adding a new chain at ' + index + ' with libs=' + JSON.stringify(libs));
  addChain(game.chains, index, libs);
  console.log('= setting piece on board to ' + move.role);
  engine.setPieceByIndex(game, index, move.role);

  console.log('');

  // update chains
  for(var i = 0 ; i < N.length; i++) {
    if(NP[i] == ' ' || NP[i] == null) continue;
    console.log('= updating neighbour chain at ' + N[i]);
    console.log('= getting rep for neighbour ' + N[i] + ' which is ' + NP[i]);
    NR[i] = find(game.chains, N[i]);
    console.log('=* rep is ' + NR[i]);
    console.log('= removing liberty ' + index + ' from rep ' + NR[i]);
    removeLibertyFromChain(game.chains, NR[i], index);
    if(NP[i] == move.role) {
      console.log('= unioning ' + rep + ' and  ' + NR[i]);
      rep = union(game.chains, rep, NR[i]);
      NR[i] = rep;
      console.log('=* new rep is ' + rep);
    }
    console.log('');
  }

  // remove any dead enemy chains
  for(var i = 0; i < N.length; i++) {
    if(NP[i] == null || NP[i] == move.role || NP[i] == ' ') continue;
    console.log('');
    console.log('= checking if neighbour ' + N[i] + ' is a dead chain (it is ' + NP[i] + ')');
    console.log('= checking to see if it has 0 liberties...');
    if(getLiberties(game.chains, NR[i]).length != 0) continue;
    console.log('= it has no liberties! kill some stuff');
    console.log('= fetching members of this chain');
    var dead = getMembers(game.chains, NR[i]);
    console.log('= there are ' + dead.length + ' of them.');
    console.log('= killing:');
    for(var j = 0; j < dead.length; j++) {
      console.log('== killing piece ' + dead[j]);
      console.log('== removing it from the board');
      engine.setPieceByIndex(game, dead[j], ' ');
      // add this piece as a liberty to all its neighbours
      console.log('== getting its neighbours');
      var deadN = getNeighbours(dead[j]);
      for(var k = 0; k < deadN.length; k++) {
        var r = engine.getPieceByIndex(game, deadN[k]);
        if(r != null && r != NP[i] && r != ' ') { // if this piece neighbours something outside of its chain
          console.log('== piece ' + deadN[k] + ' belongs to the enemy, so give them this as a liberty');
          var otherR = find(game.chains, deadN[k]);
          console.log('== it has rep ' + otherR);
          console.log('== adding liberty ' + dead[j] + ' to ' + otherR);
          addLibertyToChain(game.chains, otherR, dead[j]);
        }
      }
    }
    game.emptyPieces = game.emptyPieces.concat(dead);
  }

  console.log('= done');
  console.log('==========================');
};

engine.getPiece = function(game, r, c) {
  if(r < 0 || r > 18 || c < 0 || c > 18) return null;
  return game.board[r*19 + c];
};

engine.getPieceByIndex = function(game, index) {
  if(index == null || index < 0 || index >= 19*19) return null;
  return game.board[index];
};

engine.setPiece = function(game, r, c, role) {
  game.board[r*19 + c] = role;
};

engine.setPieceByIndex = function(game, index, role) {
  if(index == null) throw 'tried to setPieceByIndex(..., null, ...'; // TODO error
  game.board[index] = role;
};

function toIndex(r, c) {
  if(r < 0 || r > 18 || c < 0 || c > 18) return null;
  return r*19 + c;
}

function concatObjects(X, Y) {
  for(var x in Y) {
    if(!Y.hasOwnProperty(x)) continue;
    X[x] = true;
  }
}

function getNeighbours(index) {
  var r = Math.floor(index/19),
      c = index % 19;
  console.log('loc: r=' + r + ' c=' + c);
  return [
    toIndex(r, c + 1),
    toIndex(r, c - 1),
    toIndex(r + 1, c),
    toIndex(r - 1, c)
  ];
}

/* Union-find implementation */

// the "chains" variables are maps from representative to a [<number>] which
// are their constituents. The empty pieces are kept in game.emptyPieces because
// they don't behave exactly like a regular chain
// see also: constructor engine.newGame initializes chains and emptyPieces

// called to add a single element as a chain when the piece gets
// placed on the board
function addChain(chains, X, libs) {
  chains[X] = {
    contents: [X],
    liberties: {}
  };
  for(var i = 0; i < libs.length; i++) {
    chains[X].liberties[libs[i]] = true;
  }
}

function find(chains, X) {
  for(var rep in chains) {
    if(!chains.hasOwnProperty(rep)) continue;
    if(rep == X) return X;
    if(chains[rep].contents.indexOf(X) != -1) {
      return rep;
    }
  }
  throw 'asked to find something that is not in a chain!'; // TODO error
}

// X, Y must be chain representatives (i.e. the results of find())
function union(chains, X, Y) {
  if(typeof chains[X] == 'undefined') throw 'tried to union non-rep with something'; // TODO error
  if(typeof chains[Y] == 'undefined') throw 'tried to union something with non-rep'; // TODO error
  if(X == Y) return X;
  var c1 = chains[X];
  var c2 = chains[Y];
  chains[X].contents = c1.contents.concat(c2.contents);
  concatObjects(chains[X].liberties, chains[Y].liberties);
  delete chains[Y];
  return X;
}

function getMembers(chains, X) {
  if(typeof chains[X] == 'undefined') throw 'tried to getMembers on a non-rep'; // TODO error
  return chains[X].contents;
}

function getLiberties(chains, X) {
  if(typeof chains[X] == 'undefined') throw 'tried to getLiberties on a non-rep'; // TODO error
  var ans = [];
  for(var x in chains[X].liberties) {
    if(!chains[X].liberties.hasOwnProperty(x)) continue;
    ans.push(x);
  }
  return ans;
}

function addLibertyToChain(chains, X, index) {
  console.log('=== adding liberty ' + index + ' to ' + X);
  if(typeof chains[X] == 'undefined') throw 'tried to add a liberty to a non-rep';
  chains[X].liberties[index] = true;
}

function removeLibertyFromChain(chains, X, index) {
  console.log('== in removeLibertyFromChain, removing liberty ' + index + ' from rep ' + X);
  delete chains[X].liberties[index]
}

/* This makes it work in Node and the browser */
if(typeof window == 'undefined') {
  exports.engineInit = function() { return engine; }
}
