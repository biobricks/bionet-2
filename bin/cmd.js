#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var net = require('net');
var http = require('http');
var util = require('util');
var router = require('routes')(); // server side router
var websocket = require('websocket-stream');
var rpc = require('rpc-multistream'); // rpc and stream multiplexing
var auth = require('rpc-multiauth'); // authentication
var accountdown = require('accountdown'); // user/login management
var uuid = require('uuid').v4;
var accounts = require('../libs/user_accounts.js');
var Mailer = require('../libs/mailer.js');

var Writable = require('stream').Writable;
var Readable = require('stream').Readable;
var minimist = require('minimist');

var argv = minimist(process.argv.slice(2), {
  alias: {
    d: 'debug',
    p: 'port',
    s: 'settings'
  },
  boolean: [
    'debug'
  ],
default: {
  settings: '../settings.js',
  home: path.dirname(__dirname),
  port: 8000
}
});

var settings = require(argv.settings)(argv);

var db = require('../libs/db.js')(settings, users, accounts);

var index = require('../libs/indexing.js')(settings, db);

var mailer = new Mailer(settings.mailer, settings.baseUrl);


// server up static files like css and images that are the same for all users
var ecstatic = require('ecstatic')({
  root: settings.staticPath,
  baseDir: 'static',
  gzip: true,
  cache: 1,
  mimeTypes: {'mime-type':['image/svg+xml','jpg', 'png']}
});

// serve up user-uploaded static files
var userStatic = require('ecstatic')({
  root: settings.userFilePath,
  baseDir: 'user-static',
  gzip: true,
  cache: 0
});

// Start multilevel server for low level db access (e.g. backups)
var multiLevelServer = require('../libs/multilevel.js')(settings, db)

// initialize user authentication system
var users = accountdown(db.user, {
  login: { basic: require('accountdown-basic') }
});


var userCookieAuth = auth({
  secret: settings.loginToken.secret,
  cookie: {
    setCookie: true
  }
});

// Static files that require user login
router.addRoute('/user-static/*', function(req, res, match) {

  userCookieAuth(req, function(err, tokenData) {
    if(err) {
      res.statusCode = 401;
      res.end("Unauthorized: " + err);
      return;
    }
    return userStatic(req, res);
  });
});


router.addRoute('/static/*', function(req, res, match) {
  return ecstatic(req, res);
});

router.addRoute('/*', function(req, res, match) {
  var rs = fs.createReadStream(path.join(settings.staticPath, 'index.html'));
  rs.pipe(res);
});


var server = http.createServer(function (req, res) {
  var m = router.match(req.url);
  m.fn(req, res, m);
});


// start the webserver
console.log("Starting http server on " + (settings.hostname || '*') + " port " + settings.port);
server.listen(settings.port, settings.hostname);

// initialize the websocket server on top of the webserver
websocket.createServer({server: server}, function(stream) {

  var rpcMethods = require('../rpc/public.js')(settings, users, accounts, db, index, mailer);


  // these functions only available to users in the 'user' group
  rpcMethods.user = require('../rpc/user.js')(settings, users, accounts, db, index, mailer, p2p);

  var rpcMethodsAuth = auth({
    userDataAsFirstArgument: true, 
    secret: settings.loginToken.secret,
    login: require('../libs/login.js')(db, users, accounts)
  }, rpcMethods, 'group');

  // initialize the rpc server on top of the websocket stream
  var rpcServer = rpc(rpcMethodsAuth, {
    objectMode: true, // default to object mode streams
    debug: false
  });


  rpcServer.on('error', function(err) {
    console.error("Connection error (client disconnect?):", err);
  });


  // when we receive a methods list from the other endpoint
  rpcServer.on('methods', function(remote) {

    // if the remote node exports an rpc function called 'peerIdentifier'
    // then we assume it's a peer and not a web client
    if(remote.peerIdentifier) {

      if(!p2p) {
        // we don't support p2p so ask the peer to permanently disconnect
        remote.permanentlyDisconnect(function(){});
        return;
      }

      // Peers call this to register themselves.
      // They must supply baseUrl to identify themselves
      remote.getPeerInfo(function(err, info) {
        if(err) return stream.socket.close();

        p2p.connector.registerIncoming(remote, info, stream, rpcServer, function(err) {
          if(err && err._permaFail) {

            console.log("Failing permanently for:", info.id, err.message);
            remote.permanentlyDisconnect(function(){});
            return;
          }
          console.log("incoming peer connected:", info.id);
        });
      });
    }
  });


  rpcServer.pipe(stream).pipe(rpcServer);
});


// initialize the db (if it 
db.init();


var rpcMethods = require('../rpc/public.js')(settings, users, accounts, db, index, mailer);

// initialize peer to peer connectivity
var p2p;
if(!argv.nop2p) {
  p2p = require('../libs/p2p.js')(rpcMethods, settings);
}
