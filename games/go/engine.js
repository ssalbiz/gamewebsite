
exports.score = function(game) {
  return {
    wScore: 1.0,
    bScore: 1.0 - wScore
  };
};
