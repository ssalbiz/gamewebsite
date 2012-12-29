// makeClass - By John Resig (MIT Licensed)
function makeClass(){
  return function(args){
    if ( this instanceof arguments.callee ) {
      if ( typeof this.init == "function" )
        this.init.apply( this, args.callee ? args : arguments );
    } else
      return new arguments.callee( arguments );
  };
}

var Board = makeClass();

Board.prototype.init = function(canvas) {
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');

  this.board = Array(this.config.numRows * this.config.numColumns + 1).join(' ').split('');

  canvas.addEventListener('click', this.onClick.bind(this), false);
}

Board.prototype.onClick = function(e) {
  if(globals.role != 'w' && globals.role != 'b') return;
  var x = e.offsetX || e.layerX;
  var y = e.offsetY || e.layerY;
  // lol do this better XXX
  var mindist = 10000000000;
  var mini;
  var p = { r: -1, c: -1};
  for(var r = 0; r < this.config.numRows; r++) {
    for(var c = 0; c < this.config.numColumns; c++) {
      var px = this.getDrawPos(r, c);
      var dx = x - px.x;
      var dy = y - px.y;
      var dist = dx*dx + dy*dy;
      if(dist < mindist) {
        mindist = dist;
        p = { r: r, c: c};
      }
    }
  }
  if(globals.turn == globals.role && this.legalMove(p.r, p.c, globals.role)) {
    var move = {r: p.r, c: p.c, role: globals.role };
    sendMove(move);
    this.doMove(move);
  } else {
    console.log("illegal move!");
  }
}

Board.prototype.toIndex = function(r, c) {
  return r*this.config.numColumns + c;
};

Board.prototype.legalMove = function(r, c, colour) {
  // Check to make sure we don't hit an occupied square.
  if(this.getPiece(r, c) != ' ') { return false; }
  // check for suicide.
  var liberties = 0;
  var unvisited = [{'r':r, 'c':c}];
  var visited = {};
  while(unvisited.length) {
    np = unvisited.pop();
    visited[this.toIndex(np.r, np.c)] = 1;

    var north = this.getPiece(np.r - 1, np.c);
    var south = this.getPiece(np.r + 1, np.c);
    var west = this.getPiece(np.r, np.c - 1);
    var east = this.getPiece(np.r, np.c + 1);

    if(north == ' ') {
      liberties++;
    } else if(north == colour && !visited[this.toIndex(np.r-1, np.c)]) {
      unvisited.push({'r': np.r-1, 'c': np.c});
    }

    if(west == ' ') {
      liberties++;
    } else if(west == colour && !visited[this.toIndex(np.r, np.c-1)]) {
      unvisited.push({'r': np.r, 'c': np.c - 1});
    }

    if(south == ' ') {
      liberties++;
    } else if(south && !visited[this.toIndex(np.r+1, np.c)]) {
      unvisited.push({'r': np.r + 1, 'c': np.c});
    }

    if(east == ' ') {
      liberties++;
    } else if(east == colour && !visited[this.toIndex(np.r, np.c+1)]) {
      unvisited.push({'r':np.r,'c':np.c+1});
    }
  }
  return !!liberties;
};

Board.prototype.config = {
  xpad: 0.03,
  ypad: 0.03,
  numRows: 19,
  numColumns: 19,
  guideDots: [[3,3], [15, 3], [3, 15], [15, 15], [3, 9], [9, 3], [9, 9], [9, 15], [15, 9]],
  guideDotRadius: 4,
  bgColour: "#E6E19C",
  blackColour: "#111",
  whiteColour: "#EEE",
  stoneRadius: 0.4,
};

Board.prototype.getDrawPos = function(r, c) {
  var xpad = this.config.xpad * this.canvas.width;
  var ypad = this.config.ypad * this.canvas.height;
  return {
    x: xpad + c/(this.config.numColumns - 1)*(this.canvas.width - 2*xpad),
    y: ypad + (this.config.numRows - r - 1)/(this.config.numRows - 1)*(this.canvas.height - 2*ypad),
  };
}

Board.prototype.draw = function() {
  var ctx = this.ctx,
      canvas = this.canvas,
      board = this.board,
      config = this.config;

  ctx.fillStyle = config.bgColour;
  ctx.rect(0, 0, canvas.width, canvas.height);
  ctx.fill();

  // Vertical
  var xpad = config.xpad * canvas.width;
  var ypad = config.ypad * canvas.height;
  ctx.strokeStyle = config.blackColour;
  ctx.beginPath();
  for(var x = 0; x < config.numColumns; x++) {
    var px = xpad + x/(config.numColumns - 1)*(canvas.width - 2*xpad);
    ctx.moveTo(px, ypad);
    ctx.lineTo(px, canvas.height - ypad);
  }

  // Horizontal
  for(var y = 0; y < config.numRows; y++) {
    var py = ypad + y/(config.numRows - 1)*(canvas.height - 2*ypad);
    ctx.moveTo(xpad, py);
    ctx.lineTo(canvas.width - xpad, py);
  }
  ctx.stroke();

  // Guide dots
  ctx.beginPath();
  ctx.fillStyle = config.blackColour;
  for(var i = 0; i < config.guideDots.length; i++) {
    var pos = this.getDrawPos(config.guideDots[i][0], config.guideDots[i][1]);
    ctx.arc(pos.x, pos.y, config.guideDotRadius, 0, 2*Math.PI, false);
  }
  ctx.fill();

  // Stones
  var rad = config.stoneRadius/(config.numColumns - 1)*(canvas.width - 2*xpad);
  for(var r = 0; r < config.numRows; r++) {
    for(var c = 0; c < config.numColumns; c++) {
      switch(this.getPiece(r, c)) {
        case ' ': continue;
        case 'w': ctx.fillStyle = config.whiteColour; break;
        case 'b': ctx.fillStyle = config.blackColour; break;
        default:
          this.doMove({r: r, c: c, role: ' '});
          continue;
      }
      var pos = this.getDrawPos(r, c);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, rad, 0, 2*Math.PI, false);
      ctx.fill();
    }
  }
}

Board.prototype.getPiece = function(r, c) {
  if(r >= this.config.numRows || c >= this.config.numColumns || r < 0 || c < 0) return undefined;
  return this.board[r*this.config.numColumns + c];
}

Board.prototype.doMove = function(move) {
  this.board[move.r*this.config.numColumns + move.c] = move.role;
  this.draw();
}
