
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
    }
  }

  return {
    result: 'ok'
  };
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
