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

function init() {
  loginUI();

  navigator.id.watch({
    loggedInUser: globals.user ? globals.user.email : null,
    onlogin: function(assertion) {
      $.ajax({
        type: 'POST',
        url: '/auth/login',
        data: { assertion: assertion },
        success: function(res, status, xhr) {
          if(res.new) {
            globals.user = res.user;
            $('#NewUserModal').modal({ keyboard: false });
          } else {
            globals.user = res;
          }
          loginUI();
        },
        error: function(xhr, status, err) {
          globals.user = null;
          console.log('Login failure: ' + err);
          loginUI();
        }
      });
    },
    onlogout: function() {
      globals.user = null;
      $.ajax({
        type: 'POST',
        url: '/auth/logout',
        success: function(res, status, xhr) { loginUI(); },
        error: function(xhr, status, err) { console.log('Logout failure: ' + err); }
      });
    }
  });
  if(typeof subInit != 'undefined') subInit();
}

function setUserName(name) {
  globals.user.name = name; //$('#newUserName').val();
  $.ajax({
    type: 'POST',
    url: '/user',
    data: { name: globals.user.name },
    success: function() {
      loginUI();
    },
    error: function() {
      console.log('failed to set username...');
    }
  });
}

function loginUI() {
  if(globals.user != null) {
    $('#signInBtn').hide();
    document.getElementById('userDropDown').innerHTML = globals.user.name;
    $('#userDropDown').show();
    if(typeof subLoginUI !== 'undefined') subLoginUI();
  } else {
    $('#userDropDown').hide();
    $('#signInBtn').show();
    if(typeof subLoginUI !== 'undefined') subLoginUI();
  }
}

$(document).ready(init);
