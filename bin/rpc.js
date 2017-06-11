#!/usr/bin/env node

var path = require('path');
var net = require('net');
var fs = require('fs');
var rpc = require('rpc-multistream');
var auth = require('rpc-multiauth');
var minimist = require('minimist');

var argv = minimist(process.argv.slice(2), {
    alias: {
        s: 'settings'
    },
    boolean: [
        'help',
        'online'
    ],
    default: {
        settings: '../settings.js',
        home: path.dirname(__dirname)
    }
});

var settings = require(argv.settings)(argv);

var hostname;
if(process.argv.length) {
  hostname = process.argv
}

function usage(err) {
  var f;
  if(err) {
    f = console.error;
    f(err);
    f('');
  } else {
    f = console.log;
  }

  f("Usage:", path.basename(__filename), "[hostname]");
  f('');
  f("Initiate bionet RPC connection to [hostname] and start a js command line.");
  f("If hostname is not specified then connect to the local instance.");
  f('');
  if(err) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

if(cmd === 'help') {
  usage();
}

console.error("Not yet implemented. Come back later.");

// TODO actually write this utility
// It should give you a JS REPL that allows calling/testing rpc functions
