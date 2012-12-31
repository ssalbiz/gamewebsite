
var engine = {};
engine.score = function(game) {
  return {
    wScore: 1.0,
    bScore: 1.0 - wScore
  };
};

engine.verifyMove = function(game, move) {
  if(move.r < 0 && move.r > 18 || move.c < 0 || move.r > 18) {
    return {
      result: 'fail',
      reason: 'move not within boundary'
    };
  }

  if(move.role != 'w' && move.role != 'b') {
    return {
      result: 'fail',
      reason: 'role must be w or b'
    };
  }

  if(engine.getPiece(game, move.r, move.c) != ' ') {
    return {
      result: 'fail',
      reason: 'pieces cannot be placed on top of other pieces'
    };
  }

  if(!engine.countLiberties(game, move)) {
    return {
      result: 'fail',
      reason: 'pieces cannot be placed in a suicide position'
    };
  }

  return {
    result: 'ok'
  };
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
  return game.board[r*19 + c];
};

engine.setPiece = function(game, r, c, role) {
  game.board[r*19 + c] = role;
}

if (typeof window == 'undefined') {
  exports.engineInit = function() { return engine; }
}
