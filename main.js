var express = require('express');
var app = express();
var path = require('path');
var cookieParser = require('cookie-parser');
var session = require('express-session')({
  secret: "W00%A&CD&k56EI41lnZRv39@",
  resave: true,
  saveUninitialized: true
});
var sharedsession = require("express-socket.io-session");
var http = require('http').Server(app);
var db = require('./database');
var io = require('socket.io')(http);
var mustacheExpress = require('mustache-express');
var bodyParser = require('body-parser');

// models
var users = require('./models/users');
var comments = require('./models/comments');

const server_port = 8080;

// Mustache Templates
app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');

// Cookie config
app.use(cookieParser());

// Session config
app.use(session);

// Use shared session middleware for socket.io
// setting autoSave:true
io.use(sharedsession(session, {
  autoSave:true
})); 

// Required to read POST data!
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({   // to support URL-encoded bodies
  extended: true
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

var connection = db.connection;

var throwDefaultError = function(error) {
  console.log(error);
}

// Routes
app.get('/', function(request, response){
  if (!request.session.user) {
    response.redirect(302, '/login');
    return;
  }

  comments.getRecent(10).then(function(recentComments) {
    response.render('index', { name: request.session.user.name, comments: recentComments });

  }, function () {
    console.log('Couldn\'t get comments');
    response.render('index', { name: request.session.user.name, comments: false });
  });

});

app.get('/login', function(request, response) {
  response.render('login');
});
app.post('/login', function(request, response) {
  users.login(request.body).then(function(result) {
    console.log("Login success");
    request.session.user = result;
    response.redirect('/');

  }, function(error) {
    console.log(error.message);
    response.redirect('/');
  });
});


app.get('/register', function(request, response) {
  response.render('register');
});
app.post('/register', function(request, response) {
  users.createUser(request.body).then(function(result) {
    console.log("New user created");
    response.redirect('/login');

  }, throwDefaultError);
});

app.get('/duplicate', function(request, response) {
  response.send('1 session at a time please!');
});

io.on('connection', function(socket) {

  var socketSession = socket.handshake.session;

  // Note socketSession.user will not be defined if the server restarted
  // something we need to handle - matching up known window IDs?
  if (!socketSession.user) {
    socket.emit('session terminated');
    return;
  }

  if (socketSession.user.socketID) {
    // existing session?
    socket.emit('duplicate session');
  }
  else {
    console.log(socketSession.user.name + ' joined the chat');
    io.emit('chat joined', socketSession.user.name);
    
    socketSession.user.socketID = socket.id;
    socketSession.save();
  }    

  // note - can call socket.emit to send to just the one user!

	socket.on('chat message', function(msg) {
		
		var sql = "INSERT INTO chat_messages (message, user) VALUES (?, ?)";
	
		connection.query(sql, [msg, socketSession.user.id], function (error, result) {
      if (error) throw error;
		});
	
		io.emit('chat message', socketSession.user.name + ': ' + msg);
  });


  socket.on('disconnect', function() {
    if (socket.id == socketSession.user.socketID) {
      console.log(socketSession.user.name + ' left the chat');
      io.emit('chat left', socketSession.user.name);
      delete socketSession.user.socketID;
      socketSession.save();
    }
  });

});


http.listen(server_port, function(){
  console.log('listening on *:' + server_port);
});
