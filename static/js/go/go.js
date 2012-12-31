var Go = makeClass();

Go.prototype.config = {
  xpad: 0.03,
  ypad: 0.03,
  numRows: 19,
  numColumns: 19,
  guideDots: [[3,3], [15, 3], [3, 15], [15, 15], [3, 9], [9, 3], [9, 9], [9, 15], [15, 9]],
  guideDotRadius: 4,
  bgColour: "#E6E19C",
  bgColourAlt: "#E1DD99",
  stripeStep: 2,
  lineColour: "#111",
  blackColour: "#333",
  whiteColour: "#EEE",
  stoneRadius: 0.4,
};

Go.prototype.init = function(canvas) {
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');

  this.game = null;
  this.role = 's';

  canvas.addEventListener('click', this.onClick.bind(this), false);
};

Go.prototype.onClick = function(e) {
  if(this.game == null) return;
  if(this.role != 'w' && this.role != 'b') return;
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

  var move = {r: p.r, c: p.c, role: this.role };
  if(this.game.turn == this.role) {
    var res = engine.verifyMove(this.game, move);
    if(res.result == 'ok') {
      this.game.turn = this.game.turn == 'w' ? 'b' : 'w';
      this.socket.emit('move', move);
      this.doMove(move);
      playerBadgeUI();
    }
  }
};

Go.prototype.getDrawPos = function(r, c) {
  var xpad = this.config.xpad * this.canvas.width;
  var ypad = this.config.ypad * this.canvas.height;
  return {
    x: xpad + c/(this.config.numColumns - 1)*(this.canvas.width - 2*xpad),
    y: ypad + (this.config.numRows - r - 1)/(this.config.numRows - 1)*(this.canvas.height - 2*ypad),
  };
};

Go.prototype.draw = function() {
  if(this.game == null) return;
  var ctx = this.ctx,
      canvas = this.canvas,
      config = this.config;

  // Make canvas responsive (to resizes)
  // At least on my browser at the time of writing, it improves performance
  // to not assign to ctx.canvas.width/height if we dont have to
  if(ctx.canvas.width != $('#contentContainer').width()) {
    // TODO need to fix (resize -> #pixels)
    var wid = $('#contentContainer').width();
    ctx.canvas.style.width = wid;
    ctx.canvas.style.height = wid;
    canvas.style.width = wid;
    canvas.style.height = wid;
    ctx.canvas.width = wid;
    ctx.canvas.height = wid;
  }

  ctx.fillStyle = config.bgColour;
  ctx.rect(0, 0, canvas.width, canvas.height);
  ctx.fill();

  ctx.beginPath();
  ctx.lineWidth = config.stripeStep;
  ctx.strokeStyle = config.bgColourAlt;
  for(var x = 0; x < canvas.width; x += 2*config.stripeStep) {
    ctx.moveTo(x+0.5, 0);
    ctx.lineTo(x+0.5, canvas.height);
  }
  ctx.stroke();


  // Vertical
  var xpad = config.xpad * canvas.width;
  var ypad = config.ypad * canvas.height;
  ctx.lineWidth = 1;
  ctx.strokeStyle = config.lineColour;
  ctx.beginPath();
  for(var x = 0; x < config.numColumns; x++) {
    var px = xpad + Math.floor(x/(config.numColumns - 1)*(canvas.width - 2*xpad));
    ctx.moveTo(px+0.5, ypad);
    ctx.lineTo(px+0.5, canvas.height - ypad);
  }

  // Horizontal
  for(var y = 0; y < config.numRows; y++) {
    var py = ypad + Math.floor(y/(config.numRows - 1)*(canvas.height - 2*ypad));
    ctx.moveTo(xpad, py+0.5);
    ctx.lineTo(canvas.width - xpad, py+0.5);
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
      switch(engine.getPiece(this.game, r, c)) {
        case ' ': continue;
        case 'w': ctx.fillStyle = config.whiteColour; break;
        case 'b': ctx.fillStyle = config.blackColour; break;
        default:
          console.log('!!!!!');
          continue;
      }
      var pos = this.getDrawPos(r, c);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, rad, 0, 2*Math.PI, false);
      ctx.fill();
    }
  }
};

Go.prototype.doMove = function(move) {
  if(this.game == null) return;
  engine.setPiece(this.game, move.r, move.c, move.role);
  engine.evalMove(this.game, move);
  this.draw();
}

Go.prototype.login = function(host) {
  if(!this.socket) {
    this.socket = io.connect(host);

    var that = this;

    this.socket.on('authok', function(data) {
      that.game = data.game;
      if(globals.user) {
        that.role = globals.user.uid == that.game.white.uid? 'w' :
                    globals.user.uid == that.game.black.uid? 'b' : 's';
      } else {
        that.role = 's';
      }
      that.draw();
      installPlayerPopovers();
      playerBadgeUI();
    });

    this.socket.on('authnotice', function(data) {
      console.log('authnotice:');
      console.log(data);
    });

    this.socket.on('move', function(data) {
      that.game.turn = data.role == 'w' ? 'b' : 'w';

      // TODO: verify anything the server was too lazy to verify (ko)
      that.doMove(data);

      playerBadgeUI();
    });
  }

  var reg = {
    gid: window.location.href.replace(/^.*\//, '').replace(/[^0-9]+.*$/, ''),
    role: this.role
  };

  var m = document.cookie.match(/connect.sid=s%3A([^;.]*)/);
  if(m.length == 2) {
    reg.cookie = unescape(m[1]);
  }

  this.socket.emit('auth', reg);
};
