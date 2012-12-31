function subLoginUI() {
  if(!globals.go) return;
  globals.go.login();
  playerBadgeUI();
}

function makePlayerTable(user) {
  return '<table class="playerStats">' +
           '<tr><td>Rank</td><td>' + user.go.rank + '</td></tr>' +
           '<tr><td>Games played</td><td>' + user.go.played + '</td></tr>' +
           '<tr><td>&nbsp;&nbsp;won</td><td>' + user.go.won + '</td></tr>' +
           '<tr><td>&nbsp;&nbsp;tied</td><td>' + user.go.tied + '</td></tr>' +
           '<tr><td>&nbsp;&nbsp;lost</td><td>' + user.go.lost + '</td></tr>' +
         '</table>';
}

function installPlayerPopovers() {
  $('#whiteBtn').popover({
    title: globals.go.game.white.name,
    content: makePlayerTable(globals.go.game.white),
    html: true,
    trigger: 'hover',
    placement: 'bottom'
  });

  $('#blackBtn').popover({
    title: globals.go.game.black.name,
    content: makePlayerTable(globals.go.game.black),
    html: true,
    trigger: 'hover',
    placement: 'bottom'
  });
}

function playerBadgeUI() {
  var blackLabel = '';
  var whiteLabel = '';
  if(globals.go.game.turn) {
    if(globals.go.game.turn == 'w') {
      whiteLabel += '<i class="icon-star"></i> ';
    } else {
      blackLabel += '<i class="icon-star"></i> ';
    }
  }
  whiteLabel += globals.go.role == 'w'? 'Me' : globals.go.game.white.name;
  blackLabel += globals.go.role == 'b'? 'Me' : globals.go.game.black.name;
  $('#whiteBtn').html(whiteLabel);
  $('#blackBtn').html(blackLabel);
}

function subInit() {
  globals.go = new Go(document.getElementById('board'));
  globals.go.draw();
  globals.go.login(globals._go_socketHost);
}
