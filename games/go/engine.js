
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

engine.countLiberties = function(game, move) {
  var unvisited = [move.r*19 + move.c];
  var visited = {};
  var liberties = 0;
  while(unvisited.length>0) {
    next = unvisited.shift();
    // EAST
    if((next%19)-1 > 0) {
      if(game.board[next-1] == ' ') {
        liberties++;
      } else if(game.board[next-1] == move.role && !visited[next-1]) {
        unvisited.push(next-1);
      }
    }
    // WEST
    if((next%19)+1 < 19) {
      if(game.board[next+1] == ' ') {
        liberties++;
      } else if(game.board[next+1] == move.role && !visited[next+1]) {
        unvisited.push(next+1);
      }
    }
    // SOUTH
    if((next/19)+1 < 19) {
      if(game.board[next+19] == ' ') {
        liberties++;
      } else if(game.board[next+19] == move.role && !visited[next+19]) {
        unvisited.push(next+19);
      }
    }
    // NORTH
    if((next/19)-1 < 19) {
      if(game.board[next-19] == ' ') {
        liberties++;
      } else if(game.board[next-19] == move.role && !visited[next-19]) {
        unvisited.push(next-19);
      }
    }
  }
  return liberties;
};

engine.getPiece = function(game, r, c) {
  return game.board[r*19 + c];
};

engine.setPiece = function(game, r, c, role) {
  game.board[r*19 + c] = role;
}

if(typeof window == 'undefined') {
  exports = engine;
}
