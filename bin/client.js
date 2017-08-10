#!/usr/bin/env node

var path = require('path');
var fs = require('fs');
var websocket = require('websocket-stream');
var rpc = require('rpc-multistream'); // RPC and multiple streams over one stream

var settings = require(path.join(__dirname, '..', 'settings.js'))();
                       
var websocketUrl;
if(settings.ssl) {
  websocketUrl = 'wss://' + settings.hostname;
  if(settings.port !== 443) websocketUrl += ':'+settings.port;
} else {
  websocketUrl = 'ws://' + settings.hostname;
  if(settings.port !== 80) websocketUrl += ':'+settings.port;
}

try {
  var account = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'test_user.json'),  {encoding: 'utf8'}));
} catch(e) {
  console.error("Reading test_user.json failed. Did you create a test user?");
  console.error("\nHint: You can run `./bin/db.js user test` to create a test user.\n")
  fail(err);
  process.exit(1);
}

var stream = websocket(websocketUrl);

function fail(err) {
  console.error('error:', err);
}

stream.on('error', function(err) {
  fail(new Error("connection closed"));
});

stream.on('close', function() {
  fail(new Error("connection closed"));
});

var rpcClient = rpc(null, {
  objectMode: true
});

rpcClient.pipe(stream).pipe(rpcClient);

rpcClient.on('error', function(err) {
  console.log("RPCCLIENT error:", err)
  fail(err);
});

rpcClient.on('methods', function (remote) {

  remote.login({
    email: account.email,
    password: account.password
  }, function(err, token, userData) {
    if(err) {
      console.error("Login failed. Is something wrong with your test user?");
      console.error("\nHint: You can run `./bin/db.js user test` to re-create a test user.\n")
      fail(err);
      process.exit(1);
    }

    console.log("Logged in:", userData);

    remote.savePhysical({
      name: "test-physical-3344351"


    }, null, false, function(err, id) {
      if(err) return fail(err);

      console.log("Created physical with ID:", id);

      remote.clearDeleted(function(err) {
        if(err) return fail(err);
        remote.delPhysical(id, function(err) {
          if(err) return fail(err);
          
          console.log("Deleted physical with ID:", id);
          
          var s = remote.listDeleted();
          var latest;
          s.on('data', function(data) {
//            console.log("Deleted:", data);
            latest = data;
          });
          
          s.on('end', function() {
            remote.undelete(latest.key, function(err) {
              if(err) return fail(err);
              
              console.log("Undeleted:", latest.value);
              
              remote.get(latest.value.data.id, function(err, o) {
                if(err) return fail(err);
                
                console.log("Got:", o);
              });
            });
          });
        });
      });
    });
    
  });

});
