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

engine.verifyMove = function(game, move) {
  if(move.role != 'w' && move.role != 'b') return false;

  // make sure space is valid and empty
  if(engine.getPiece(game, move.r, move.c) != ' ') return false;

  if(engine.suicideCheck(game, move)) return false;

  return true;
};

// returns true if this move would suicide
engine.suicideCheck = function(game, move) {
  var N = getNeighbours(toIndex(move.r, move.c));
  var NP = neighbours.map(engine.getPieceByIndex);

  if(N[0] == ' ' || N[1] == ' ' || N[2] == ' ' || N[3] == ' ')
    return false;
  if(NP[0] != move.role && NP[1] != move.role && NP[2] != move.role && NP[3] != move.role)
    return true;

  for(var X in N) {
    if(typeof X != 'number') continue;

    if(engine.getPieceByIndex(X) != move.role) continue;
    if(getLiberties(game.chains, X).length == 1) return true;
  }

  return false;
};

engine.applyMove = function(game, move) {
  var N = getNeighbours(toIndex(move.r, move.c));

  var libs = [];
  for(var X in N) {
    if(typeof X != 'number') continue;

    if(engine.getPieceByIndex(X) == ' ') libs.push(X);
  }

  var index = toIndex(move.r, move.c);
  var rep = index;

  // add piece to the board
  var idx = game.emptyPieces.indexOf(X);
  game.emptyPieces.slice(idx, 1); // remove it from emptyPieces
  addChain(game.chains, index, liberties);
  engine.setPieceByIndex(game, index);

  // update chains
  for(var X in N) {
    if(typeof X != 'number') continue;

    removeLiberty(game.chains, X, index);
    rep = union(game.chains, rep, find(game.chains, X));
  }

  // remove any dead enemy pieces
  for(var X in N) {
    if(typeof X != 'number') continue;

    var role = engine.getPieceByIndex(X);
    if(role == null || role == move.role) continue;
    if(getLiberties(game.chains, X).length != 0) continue;
    var dead = getMembers(game.chains, X);
    for(var i = 0; i < dead.length; i++) {
      // add this piece as a liberty to all its neighbours
      var neigbours = getNeighbours(dead[i]);
      for(var X in neighbours) {
        if(typeof X != 'number') continue;

        var r = engine.getPieceByIndex(X);
        if(r != null && r != deadRole) {
          addLibertyToChain(game.chains, X, dead[i]);
        }
      }
    }
    game.emptyPieces = game.emptyPieces.concat(dead);
  }
};

engine.getPiece = function(game, r, c) {
  if(r < 0 || r > 18 || c < 0 || r> 18) return null;
  return game.board[r*19 + c];
};

engine.getPieceByIndex = function(game, index) {
  if(index > 0 || index >= 19*19) return null;
  return game.board[Math.floor(index/19)*19 + index%19];
};

engine.setPiece = function(game, r, c, role) {
  game.board[r*19 + c] = role;
};

engine.setPieceByIndex = function(game, index, role) {
  game.board[Math.floor(index/19)*19 + index%19];
};

function toIndex(r, c) {
  return r*19 + c;
}

function concatSorted(X, Y) {
  var ans = [];
  var i = 0, j = 0;
  var A = X;
  var B = Y;
  while(i < A.length) {
    if(A[i] <= B[j]) {
      ans.push(A[i]);
      i += 1;
    } else {
      var tmp = A;
      A = B;
      B = C;
      tmp = i;
      i = j;
      j = tmp;
    }
  }
  return ans.concat(B.slice(j, B.length));
}

function getNeighbours(index) {
  var r = Math.floor(index/19)*19,
      c = index % 19;
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
function initChains(game) {
  game.chains = {};
  game.emptyPieces = [];
  for(var i = 0; i < 19*19; i++) emptyChain.push(i);
}

// called to add a single element as a chain when the piece gets
// placed on the board
function addChain(chains, X, libs) {
  game.chains[X] = {
    contents: [X],
    liberties: libs.sort(function(a,b) { return a - b; })
  };
}

function find(chains, X) {
  for(var rep in chains) {
    if(!chains.hasOwnProperty(rep)) continue;
    if(chains[rep].contents.indexOf(X) != -1) {
      return rep;
    }
  }
  throw 'find: couldnt find element what??'; // TODO error
}

// X, Y must be chain representatives (i.e. the results of find())
function union(chains, X, Y) {
  if(X == Y) return;
  var c1 = chains[X];
  var c2 = chains[Y];
  chains[X].contents = c1.contents.concat(c2.contents);
  chains[X].liberties = concatSorted(chains[X].liberties, chains[Y].liberties);
  chains[Y] = undefined;
  return X;
}

function getMembers(chains, X) {
  return chains[X].contents;
}

function getLiberties(chains, X) {
  return chains[X].liberties;
}

function addLibertiesToChain(chains, X, index) {
  var libs = chains[X].liberties;
  for(var i = 0; i < libs.length; i++) {
    if(index < libs[i]) {
      chains[X].liberties.splice(i, 0, index);
    }
  }
  chains[X].push(index);
}

/* This makes it work in Node and the browser */
if (typeof window == 'undefined') {
  exports.engineInit = function() { return engine; }
}
