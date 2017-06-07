#!/usr/bin/env node

var path = require('path');
var net = require('net');
var fs = require('fs');
var level = require('level'); // leveldb database
var through = require('through2');
var multilevel = require('multileveldown'); // remote db access
var sublevel = require('subleveldown'); // leveldb multiplexing
var accountdown = require('accountdown'); // user/login management
var JSONStream = require('JSONStream');

var minimist = require('minimist');
var argv = minimist(process.argv.slice(2), {
    alias: {
        s: 'settings',
        f: 'force'
    },
    boolean: [
        'help',
        'force', // 
        'online' // if set, this script will fail if the bionet app isn't running
    ],
    default: {
        settings: '../settings.js',
        home: path.dirname(__dirname)
    }
});

var settings = require(argv.settings)(argv);

function usage(err) {
  var f;
  if(err) {
    f = console.error;
    f(err);
    f('');
  } else {
    f = console.log;
  }

  f("Usage:", path.basename(__filename), "cmd [args]");
  f('');
  f("Where cmd is one of the following:");
  f('');
  f("  dump: Dump the entire database as JSON to stdout");
  f("  import [-f] file.json: Import database from JSON (use -f to force)");
  f("  user: view users");
  f("    list: Print list of all users");
  f("  help: Display this usage message");
  f('');
  f("  The --online flag will cause this script to fail if the bionet app");
  f("  isn't currently running.");
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

function isDBEmpty(cb) {
  var dbs = db.createKeyStream();
  var empty = true;
  dbs.on('data', function() {
    empty = false;
    dbs.destroy();
  });

  dbs.on('end', function() {
    cb(null, empty);
  });
}


if(argv._.length < 1) {
  usage("No command specified");
}

var cmd = argv._[0];
var args = argv._.slice(1);

if(!cmd) {
  usage("No command specified");
}

if(cmd === 'help') {
  usage();
}

var db = multilevel.client();
var con = net.connect(settings.dbPort);

con.on('error', function(err) {
  if(argv.online) {
    console.error("Error: bionet app appears to be offline");
    console.error("       and --online flag was specified");
    process.exit(1);
  }
  console.error("Warning: bionet app appears to be offline")
  console.error("Warning: opening bionet database directly");
  db = level(settings.dbPath || './db');
  db.on('ready', function() {
    main();
  });
});

con.on('connect', function() {
  con.pipe(db.connect()).pipe(con);
  main();
});


function main() {

  if(cmd.match(/^d/)) { // dump

    var dbs = db.createReadStream()
    var jstream = JSONStream.stringifyObject();
    dbs.pipe(through.obj(function(obj, enc, cb) {
      console.log('--------------');
      // reformat key/value as array since stringifyObject expects that
      this.push([obj.key, obj.value])
      cb();
    })).pipe(jstream).pipe(process.stdout);

    dbs.on('end', function() {
      con.end();
    })


  } else if(cmd.match(/^i/)) { // import

    if(args.length !== 1) {
      usage("Missing name of file to import")
    }
    isDBEmpty(function(err, isEmpty) {
      if(err) fail(err);

      if(!isEmpty) {
        if(!argv.force) {
          fail("Trying to import into non-empty database.\nRe-run command with --force to import anyway.");
        }
      }
    });
    var count = 0;
    var ins = fs.createReadStream(args[0], {encoding: 'utf8'});
    var jstream = JSONStream.parse([{emitKey: true}]);

    jstream.pipe(through.obj(function(obj, enc, cb) {    
      db.put(obj.key, obj.value, cb);
      count++;
    }, function(cb) {
      console.log("Imported", count, "rows.");    
      con.end()
    }));

    ins.pipe(jstream)

  } else if(cmd.match(/^u/)) { // user

    var subCmd;

    if(args.length > 0) {
      subCmd = args[0];
    } else {
      subCmd = 'list';
    }

    db.on('open', function() {
      var userDB = sublevel(db, 'accountdown', { valueEncoding: 'json' });

      var users = accountdown(userDB, {
        login: { basic: require('accountdown-basic') }
      });
      
      count = 0;
      if(subCmd.match(/^l/)) {
        var s = users.list();
        s.pipe(through.obj(function(data, enc, cb) {
          console.log(data.value);
          cb();
          count++;
        }, function() {
          console.log("Listed", count, "users");
        }));

      } else {
        usage("Invalid user command");
      }

    });

  } else {
    usage("Invalid command");
  }
}
