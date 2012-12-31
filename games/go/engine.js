
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

  if(!engine.countLiberties(game, move)) {
    return {
      result: 'fail',
      reason: 'pieces cannot be placed in a suicide position'
    };
  }

  return true;
};

engine.evalMove = function(game, move) {
  // count liberties of opposing stones in NSEW adj and remove the chains if necessary.
  var opp = move.role == 'w' ? 'b':'w';
  if(move.r > 0 && game.board[(move.r-1)*19+move.c] == opp &&
      !engine.countLiberties(game, {r:move.r-1, c:move.c, role:opp})) {
    engine.removeChain(game, {r:move.r-1, c:move.c, role:opp});
  }
  if(move.c > 0 && game.board[(move.r)*19+move.c-1] == opp &&
      !engine.countLiberties(game, {r:move.r, c:move.c-1, role:opp})) {
    engine.removeChain(game, {r:move.r, c:move.c-1, role:opp});
  }
  if(move.r+1 < 19 && game.board[(move.r+1)*19+move.c] == opp &&
      !engine.countLiberties(game, {r:move.r+1, c:move.c, role:opp})) {
    engine.removeChain(game, {r:move.r+1, c:move.c, role:opp});
  }
  if(move.c+1 > 19 && game.board[(move.r)*19+move.c+1] == opp &&
      !engine.countLiberties(game, {r:move.r, c:move.c+1, role:opp})) {
    engine.removeChain(game, {r:move.r, c:move.c+1, role:opp});
  }
  return;
};

engine.countLiberties = function(game, move) {
  var context = {liberties:0};
  engine.floodfill(game, move, context, function(game, ctx, pos) {
    if(game.board[pos] == ' ') {
      ctx.liberties++;
    }
  });
  return context.liberties;
};

engine.removeChain = function(game, move) {
  game.board[move.r*19+move.c] = ' ';
  engine.floodfill(game, move, {}, function(game, ctx, pos) {
    if(game.board[pos] == move.role) {
      game.board[pos] = ' ';
    }
  });
};

engine.floodfill = function(game, move, ctx, fn) {
  var unvisited = [move.r*19 + move.c];
  var visited = {};
  while(unvisited.length>0) {
    next = unvisited.shift();
    visited[next] = 1;
    // EAST
    if((next%19)-1 > 0) {
      if(game.board[next-1] == move.role && !visited[next-1]) {
        unvisited.push(next-1);
      }
      fn(game, ctx, next-1);
    }
    // WEST
    if((next%19)+1 < 19) {
      if(game.board[next+1] == move.role && !visited[next+1]) {
        unvisited.push(next+1);
      }
      fn(game, ctx, next+1);
    }
    // SOUTH
    if((next/19)+1 < 19) {
      if(game.board[next+19] == move.role && !visited[next+19]) {
        unvisited.push(next+19);
      }
      fn(game, ctx, next+19);
    }
    // NORTH
    if((next/19)-1 < 19) {
      if(game.board[next-19] == move.role && !visited[next-19]) {
        unvisited.push(next-19);
      }
      fn(game, ctx, next-19);
    }
  }
};

engine.getPiece = function(game, r, c) {
  if(r < 0 || r > 18 || c < 0 || r> 18) return null;
  return game.board[r*19 + c];
};

engine.getPieceByIndex = function(game, index) {
  if(index > 0 || index >= 19*19) return null;
  return game.board[Math.floor(index/19)*19 + index%19];
}

engine.setPiece = function(game, r, c, role) {
  game.board[r*19 + c] = role;
}

/* Union-find implementation */

// the "chains" variables are maps from representative to a [<number>] which
// are their constituents

function initChains() {
  var all = [];
  for(var i = 0; i < 19*19; i++) { all.push(i); }
  return { '0': all };
}

function find(chains, X) {
  for(var rep in chains) {
    if(!chains.hasOwnProperty(rep)) continue;
    if(chains[rep].indexOf(X) != -1) {
      return rep;
    }
  }
  throw { 'find: couldnt find element what??'  }; // TODO error
}

// X, Y must be chain representatives (i.e. the results of find())
function union(chains, X, Y) {
  if(X == Y) return;
  var c1 = chains[X];
  var c2 = chains[Y];
  chains[X] = c1.concat(c2);
  chains[Y] = undefined;
  return x;
}

/* This makes it work in Node and the browser */
if (typeof window == 'undefined') {
  exports.engineInit = function() { return engine; }
}
