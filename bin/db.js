#!/usr/bin/env node

var path = require('path');
var net = require('net');
var level = require('level'); // leveldb database
var multilevel = require('multilevel'); // remote db access
var sublevel = require('subleveldown'); // leveldb multiplexing

var minimist = require('minimist');
var argv = minimist(process.argv.slice(2), {
    alias: {
        s: 'settings'
    },
    boolean: [
        'debug',
        'help'
    ],
    default: {
        settings: '../settings.js',
        home: path.dirname(__dirname)
    }
});

var settings = require(argv.settings);

function usage(err) {
  var f;
  if(err) {
    f = console.error;
    f(str);
    f('');
  } else {
    f = console.log;
  }

  f("Usage:", path.basename(__filename), "CMD");
  f('');
  f("Where CMD is one of the following:");
  f('');
  f("  dump: Dump the entire database to stdout");
  f("  help: Display this usage message");
  f('');
  if(err) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

function fail(str, exitCode) {
  console.error(str);
  process.exit(exitCode || 1);
}

if(argv._.length < 1) {
  
}

var cmd = argv._[0];

if(!cmd) {
  usage("No command specified");
}

if(cmd === 'help') {
  usage();
}

var db = multilevel.client();
var con = net.connect(settings.dbPort);
con.pipe(db.createRpcStream()).pipe(con);

if(cmd === 'dump') {
  var s = db.createReadStream()

  s.on('data', function(data) {
    // TODO pipe through https://github.com/dominictarr/JSONStream
    console.log(data.key, data.value);
  });

  s.on('close', function() {
    con.end();
  })
  return;
}
