#!/usr/bin/env node

var websocket = require('websocket-stream');
var rpc = require('rpc-multistream'); // RPC and multiple streams over one stream
var auth = require('rpc-multiauth'); // authentication

var websocketUrl = "ws://localhost:8000";

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

  console.log('connected');
});
