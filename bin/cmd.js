#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var net = require('net');
var http = require('http');
var util = require('util');
var router = require('routes')(); // server side router
var websocket = require('websocket-stream');
var rpc = require('rpc-multistream'); // rpc and stream multiplexing
var auth = require('rpc-multiauth'); // auth
var level = require('level'); // leveldb database
var multilevel = require('multileveldown'); // share one leveldb between processes
var sublevel = require('subleveldown'); // leveldb multiplexing
var accountdown = require('accountdown'); // user/login management
var uuid = require('uuid').v4;
var through = require('through2');
var treeIndex = require('level-tree-index');
var ElasticIndex = require('level-elasticsearch-index');
var accounts = require('../libs/user_accounts.js');
var printServer = require('../libs/print_server.js');
var Mailer = require('../libs/mailer.js');
var IDGenerator = require('../libs/id_generator.js'); // atomically unique IDs
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

var settings = require(argv.settings);

settings.debug = argv.debug || settings.debug;
if(settings.debug) {
    // don't actually end emails in debug mode
    settings.mailer.type = 'console';
}

var mailer = new Mailer(settings.mailer, settings.base_url);

// serve static files
settings.staticPath = path.join(__dirname, '..', settings.staticPath);

var ecstatic = require('ecstatic')({
    root: settings.staticPath,
    baseDir: 'static',
    gzip: true,
    cache: 1,
    mimeTypes: {'mime-type':['image/svg+xml','jpg', 'png']}
});

settings.userFilePath = path.join(__dirname, '..', settings.userFilePath);
var userStatic = require('ecstatic')({
    root: settings.userFilePath,
    baseDir: 'user-static',
    gzip: true,
    cache: 0
});
settings.labelImageFilePath = path.resolve(path.join(settings.userFilePath, settings.labelImageFilePath));

var db = level(settings.dbPath || './db');
var bioDB = sublevel(db, 'b');
var virtualDB = sublevel(bioDB, 'v-', {valueEncoding: 'json'});
var physicalDB = sublevel(bioDB, 'p-', {valueEncoding: 'json'});
var cartDB = sublevel(bioDB, 'c-', {valueEncoding: 'json'});

// Start multilevel server for low level db access (e.g. backups)
var multiLevelServer = net.createServer(function(con) {
  con.pipe(multilevel.server(db)).pipe(con);
  con.on('error', function(err) {
    con.destroy();
    console.error("multilevel client error:", err);
  });
}).listen({
  host: settings.dbHostname || 'localhost',
  port: settings.dbPort || 13377
}, function(err) {
  console.log("multilevel listening");
});

multiLevelServer.on('error', function(err) {
    console.error("multilevel server error:", err);
})

var userDB = sublevel(db, 'u', { valueEncoding: 'json' });
var users = accountdown(userDB, {
    login: { basic: require('accountdown-basic') }
});


var indexDB = sublevel(db, 'i');
var recentDB = sublevel(indexDB, 'changed', { keyEncoding: 'utf8', valueEncoding: 'utf8' });
var physicalTree = treeIndex(physicalDB, sublevel(indexDB, 't'), {
  parentProp: 'parent_id'
});

var elasticIndex = ElasticIndex(bioDB);

elasticIndex.add('name', function(key, val) {
  val = JSON.parse(val); // TODO this should not be needed

  var o = {
    id: val.id,
    name: val.name
  };

  return o;
});

// TODO for debug only
physicalTree.rebuild(function(err) {
  if(err) return console.error("inventory tree rebuild error:", err);
  console.log("Finished inventory tree rebuild");
});

elasticIndex.rebuildAll(function(err) {
  if(err) return console.error("elastic index rebuild error:", err);
  console.log("Finished elastic index rebuild");
});

var miscDB = sublevel(db, 'm');
var idGenerator = new IDGenerator(miscDB);


// TODO this is terrible
function addToIndex(p) {
    recentDB.put(p.updated, p.id);
}
function delFromIndex(p) { // ToDo never even called
    recentDB.del(p.updated);
}

var myAuth = auth({
    secret: settings.loginToken.secret,
    cookie: {
        setCookie: true
    }
});


// Static files that require user login
router.addRoute('/user-static/*', function(req, res, match) {

    myAuth(req, function(err, tokenData) {
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


console.log("Starting http server on " + (settings.hostname || '*') + " port " + settings.port);

server.listen(settings.port, settings.hostname);

var testUser = {
  email: 'marc@juul.io',
  password: 'foo',
  id: '1234'
}

// generate unix epoch time for n days from now
// call with no arguments for now
function unixEpochTime(days) {
    days = days || 0;
    return Math.floor((new Date((new Date).getTime() + days * 24 * 60 * 60 * 1000)).getTime()/1000);
}


printServer.start(settings, function(err) {
    if(err) return console.error(err);

    console.log("Printserver started");
});


function changeInfo(userData) {
  return {
    user: userData.user.email,
    time: unixEpochTime()
  };
}

function saveMaterialInDB(m, userData, dbType, cb) {
  if(!m.name || !m.name.trim()) return cb("Name must be specified");

  idGenerator.getCur(function(err, curID) {
    if(err) return cb(err);

    // TODO check for human readable id
//  if(!m.humanID || m.humanID > curID) {
//    return cb("missing or invalid human readable ID");
//  }

    m.id = m.id || dbType+'-'+uuid();

    var db;
    if(dbType === 'v') {
      db = virtualDB;
    } else if(dbType === 'p') {
      db = physicalDB;
    }

    var c = changeInfo(userData);
    m.created = m.created || c;
    m.updated = c;

    if(settings.debug) {
      console.log("Saving to bioDB. Key:", m.id, "Value:", m);
    }

    db.put(m.id, m, {valueEncoding: 'json'}, function(err) {
      if(err) return cb(err);
      addToIndex(m);

      // TODO temporary workaround for level-tree-index fix
      physicalTree.rebuild(function(err) {
        if(err) return cb(err);
        cb(null, m.id);
      });

    });
  })
}

function userCartDB(userID) {
  return sublevel(cartDB, userID, {valueEncoding: 'json'});
}


// TODO use indexes
function getBy(field, value, cb) {

  var s = bioDB.createReadStream({valueEncoding: 'json'});
  var found = false;
  var out = s.pipe(through.obj(function(data, enc, next) {
    if(!data || !data.value || !data.value[field]) return next()
    if(data.value[field] == value) {
      found = true;
      cb(null, data.value);
      s.destroy();
    } else {
      next();
    }
  }));
  
  s.on('end', function() {
    if(!found) {
      found = true;
      cb(null, null);
    }
  });

  s.on('error', function(err) {
    if(!found) {
      found = true;
      cb(err);
    }
  });
}

function savePhysical(curUser, m, imageData, doPrint, cb, isUnique) {

  if(!m.id && !isUnique) { // if no id then this is a new physical

    // check for name uniqueness
    getBy('name', m.name, function(err, value) {
      if(err) return cb(err);
      if(value) {
        return cb(new Error("Another physical is already named: " + m.name));
      } 
      savePhysical(curUser, m, imageData, doPrint, cb, true);
    });
    return;
  }

  // if a container is specified by name
  if(m.selectContainer) {
    // check for name uniqueness
    //getBy('name', m.name, function(err, value) {
    getBy('name', m.selectContainer, function(err, value) {
      if(err) return cb(err);
      if(!value) {
        if(m.parent_id) {
          savePhysical(curUser, m, imageData, doPrint, cb, true);
          return;
        }
        return cb(new Error("No valid container specified"));
      }
      if(m.id === value.id) {
        return cb(new Error("Physical cannot contain itself"));
      }
      
      delete m.selectContainer;
      m.parent_id = value.id;

      savePhysical(curUser, m, imageData, doPrint, cb, true);
    });

    return;
  }
  
  if(!m.parent_id) {
    return cb(new Error("No container specified"));
  }

  var mtch;
  if(imageData && (mtch = imageData.match(/^data:image\/png;base64,(.*)/))) {

    var imageBuffer = new Buffer(mtch[1], 'base64');
    // TODO size check
    var imagePath = path.join(settings.labelImageFilePath, m.id+'.png')
    fs.writeFile(imagePath, imageBuffer, function(err) {
      if(err) return cb(err);

      m.labelImagePath = imagePath; 
      delete m.hidden; // don't allow users to create hidden physicals
      if(m.name && m.name[0] === '_') return cb(new Error("Name cannot begin with an underscore")); // if name begins with an underscore than these are hidden from the normal tree index output

      saveMaterialInDB(m, curUser, 'p', function(err, id) {
        if(err) return cb(err);
        if(!doPrint) return cb(null, id);

        var relativePath = path.relative(settings.labelImageFilePath, imagePath);
        printServer.printLabel(relativePath);
        console.log("relative path:", relativePath);
        cb(null, id);
      });
      console.log("saved with file", imagePath);
    });
  } else {
    saveMaterialInDB(m, curUser, 'p', cb);
    console.log("saved with no file");
  }

  console.log("saving:", m);
}

websocket.createServer({server: server}, function(stream) {

  var rpcServer = rpc(auth({
    userDataAsFirstArgument: true, 
    secret: settings.loginToken.secret,
    login: function(loginData, cb) {
      console.log("login attempt:", loginData);
      creds = {
        username: loginData.email,
        password: loginData.password
      };
      
      users.verify('basic', creds, function(err, ok, id) {
        if(err) return cb(err)
        if(!ok) return cb("Invalid username or password");
        
        users.get(id, function(err, user) {
          if(err) return cb(err);

          // ToDo don't hard-code group
          cb(null, id, {user: user, group: 'user'});
        });
      });
    }
  }, {
    
    foo: function(curUser, user, cb) {
      console.log("foo called");
      cb(null, "foo says hi");
    },

    checkMasterPassword: function(curUser, password, cb) {

      if(password != settings.userSignupPassword) {
        return cb("Invalid master password");
      }
      cb();
    },
    
    createUser: function(curUser, email, password, opts, cb) {
      if(typeof opts === 'function') {
        cb = opts;
        opts = {};
      }
      if(settings.userSignupPassword) {
        if(opts.masterPassword != settings.userSignupPassword) {
          return cb("Invalid master signup password");
        }
      }
      var user = {email: email};

      accounts.create(users, user, password, mailer, function(err) {
        saveMaterialInDB({
          type: 'workbench',
          name: '_workbench-'+uuid(),
          hidden: true
        }, {user: user}, 'p', function(err, id) {
          if(err) return cb(err);
          
          // associate workbench with user
          user.workbenchID = id;
          accounts.update(users, user, cb);
        });
      });
    }, 


    verifyUser: function(curUser, code, cb) {
      accounts.verify(users, code, cb);
    }, 

    requestPasswordReset: function(curUser, emailOrName, cb) {
      accounts.requestPasswordReset(users, mailer, emailOrName, cb);
    }, 

    checkPasswordResetCode: function(curUser, resetCode, cb) {
      accounts.checkPasswordResetCode(users, resetCode, cb);
    },

    completePasswordReset: function(curUser, resetCode, password, cb) {
      accounts.completePasswordReset(users, resetCode, password, cb);
    },

    user: { // only users in the group 'user' can access this namespace
      secret: function(curUser, cb) {
        cb(null, "Sneeple are real!");
      },

      // TODO remove this when implementing private data
      testStream: rpc.syncReadStream(function() {

        return physicalDB.createReadStream();
      }),

      // get user's workbench physical
      getWorkbench: function(curUser, cb) {
        if(!curUser.user.workbenchID) return cb(new Error("User workbench missing"));

        physicalDB.get(curUser.user.workbenchID, cb);
      },

      workbenchTree: function(curUser, cb) {
        if(!curUser.user.workbenchID) return cb(new Error("User workbench missing"));

        physicalTree.childrenFromKey(curUser.user.workbenchID, cb);
      },
        
      getChildren: function(curUser, id, cb) {
        physicalTree.childrenFromKey(id, cb);
      },

      saveInWorkbench: function(curUser, m, imageData, doPrint, cb) {
        if(!curUser.user.workbenchID) return cb(new Error("User workbench missing"));
        
        m.parent_id = curUser.user.workbenchID;
        savePhysical(curUser, m, imageData, doPrint, cb);
      },

      getID: function(curUser, cb) {
        idGenerator.next(cb);
      },

      delMaterial: function(curUser, id, cb) {
        console.log('delMaterial:',id);
        if(!id) return cb("Missing id");
        
        //bioDB.del(id, cb);
        physicalDB.del(id, cb);
      },
      
      delPhysical: function(curUser, id, cb) {
        console.log('delPhysical:',id);
        if(!id) return cb("Missing id");
        physicalDB.del(id, cb);
      },

      physicalAutocomplete: function(curUser, query, cb) {

        query = query.trim().toLowerCase();
        var a = [];

        // TODO improve
        var s = physicalDB.createReadStream();
        
        s.on('data', function(data) {
          if(!data.value.name.toLowerCase().match(query)) return;
          if(data.value.hidden) return; // skip hidden physicals

          a.push(data.value);

/*
          a.push({
            text: data.value.name,
            id: data.key
          });
*/
        });

        s.on('error', function(err) {
          return cb(err);
        });

        s.on('end', function() {
          return cb(null, a);
        });

      },

      // add a physical to user's cart
      addToCart: function(curUser, physical_id, name, cb) {
        
        var o = {
          user: curUser.user.email,
          physical_id: physical_id,
          created: unixEpochTime()
        }
        
        var ucDB = userCartDB(o.user);
        
        // TODO is it too dangerous to use the physical's name as a key here?
        // they should be unique, but are we really ensuring that?
        ucDB.put(name, o, cb);
      },
        
      // stream a user's cart
      cartStream: rpc.syncReadStream(function(curUser, cb) {
          
        const cartStream = Readable({ objectMode: true });
        cartStream._read = function() {}

        var ucDB = userCartDB(curUser.user.email);
        var s = ucDB.createReadStream();

        // TODO 
        // It would be much more efficient if we simply cached the
        // path info and the whole physical object in the cart db
        // but then it might become out of sync with the real location.
        // Probably better to play it safe for now and optimize later.

        var out = s.pipe(through.obj(function(data, enc, next) {
          if(!data || !data.value || !data.value.physical_id) return next();
            
          physicalDB.get(data.value.physical_id, function(err, o) {
            if(err) {
              if(err.notFound) return next();
              return cb(err);
            }
            physicalTree.path(o.id, function(err, path) {
                
              if(err) return cb(err);
              cartStream.push({
                physical: o,
                path: path
              })
              next();
              
            });
          });
        }));

        s.on('close', function() {
            cb();
        });

        out.on('error', function(err) {
            cb(err);
            console.error("cart stream error:", err);
        });
          
        return cartStream;
      }),

      delFromCart: function(curUser, physical_id, cb) {
        var ucDB = userCartDB(curUser.user.email);

        physicalDB.get(physical_id, function(err, o) {
          if(err) return cb(err);

          ucDB.del(o.name, cb)
        });
      },

      emptyCart: function(curUser, cb) {
        var ucDB = userCartDB(curUser.user.email);
        var s = ucDB.createKeyStream();

        var out = s.pipe(through.obj(function(key, enc, next) {
          
          ucDB.del(key, function(err) {
            if(err) return cb(err);
            next();
          })

        }));
        
        s.on('close', function() {
          cb();
        });
        
        out.on('error', function(err) {
          cb(err);
        });
      },
      
      getType: function(curUser, name, cb) {
        name = name.toLowerCase().trim().replace(/\s+/g, ' ')
        process.nextTick(function() {
          var i;
          for(i=0; i < settings.dataTypes.length; i++) {
            if(settings.dataTypes[i].name === name) {
              cb(null, settings.dataTypes[i]);
              return;
            }
          }
          var err = new Error("No type with the specified name exists");
          err.notFound = true;
          cb(err);
        })
      },

      createAutocomplete: function(curUser, type, q, cb) {
        var results = {
          types: [],
          virtuals: []
        };
        if(!q) return cb(null, results);
        q = q.toLowerCase().trim()

        if(!q.length) return cb(null, results);

        q = q.replace(/\s+/g, '.*')
        q = new RegExp(q);

        // type not already specified so return type hits
        if(!type) {
          var i;
          for(i=0; i < settings.dataTypes.length; i++) {
            if(settings.dataTypes[i].name.match(q)) {
              results.types.push(settings.dataTypes[i]);
            }
          }
        } else {
          type = type.name.toLowerCase().trim()
        }
        
        var s = virtualDB.createReadStream({valueEncoding: 'json'});
        
        var out = s.pipe(through.obj(function(data, enc, cb) {

          if((data.value.name && data.value.name.toLowerCase().match(q))) {
            if(!type || (type && data.value.type === type)) {
              if(results.virtuals.length <= 10) {
                results.virtuals.push(data.value) 
                if(results.virtuals.length >= 10) {
                  s.destroy();
                  return;
                }
              }
            }
          }
          cb()
        }));

        s.on('close', function() {
          cb(null, results);
        });

        out.on('end', function() {
        });
        
        out.on('error', function(err) {
          cb(err); // TODO handle better
          console.error("search stream error:", err);
        });
      },

      saveVirtual: function(curUser, m, cb) {

        saveMaterialInDB(m, curUser, 'v', function(err, id) {
          if(err) return cb(err);
          
          return cb(null, id);
        });
      },

      savePhysical: function(curUser, m, imageData, doPrint, cb) {
        savePhysical(curUser, m, imageData, doPrint, cb);
      },

      elasticSearch: function(curUser, query, cb) {

        elasticIndex.search('name', {
          query: {
            "match_phrase_prefix": {
              "name": {
                "query": query
              }
            }
          }}, function(err, result) {

            if(err) return cb(err);

            cb(null, result.hits.hits);
          });
        
      },

      // get the entire physical inventory tree
      // TODO implement a server side filter for the physicals tree
      inventoryTree: function(curUser, cb) {
        physicalTree.children(null, {
          ignore: function(obj) {
            // ignore paths with parts beginning with _
            var pathParts = obj.path.split('.');
            var i;
            for(i=0; i < pathParts.length; i++) {
              if(pathParts[i].match(/^_/)) {
                return true;
              }
            }
            return false;
          }
        }, cb);
      },

      // get all physical instances of a virtual
      // TODO create an index for this
      instancesOfVirtual: function(curUser, virtual_id, cb) {
        var results=[];
        var s = physicalDB.createReadStream({
          valueEncoding: 'json'
        });
        var out = s.pipe(through.obj(function(data, enc, next) {
          if(!data || !data.value || !data.value.virtual_id) return next()

          if(data.value.virtual_id === virtual_id) {
            results.push(data.value);
          }
          next();
        }));
        
        s.on('close', function() {
          cb(null,results);
        });
        
        out.on('error', function(err) {
          cb(err);
          console.error("instancesofvirtual error:", err);
        });
        
        return out;
      },

      getLocationPath: function (curUser, id, cb) {
          
        if (id[0] !== 'p') {
            cb(new Error("getLocationPath only works for physicals"));
        }
          
        const db = physicalDB;
        const results = [];

        const getParentLocation = function (id) {
            db.get(id, {
                valueEncoding: 'json'
            }, function (err, p1) {
                if (err) {
                    return cb(err, null);
                }
                results.push(p1);
                if (p1.parent_id) {
                    getParentLocation(p1.parent_id);
                } else {
                    return cb(null, results);
                }
            });
        }
        getParentLocation(id);
      },
        
      get: function(curUser, id, cb) {
        console.log("getting:", id);
        var first = id[0];
        var db;
        if(first === 'p') {
          db = physicalDB;
        } else if(first === 'v') {
          db = virtualDB;
        } else {
          return cb(new Error("Unknown material class"));
        }
        db.get(id, {valueEncoding: 'json'}, function(err, p) {
          if(err) return cb(err);
          cb(null, p);
        });
      },

      // TODO use indexes for this!
      getByHumanID: function(curUser, humanID, cb) {

        var s = bioDB.createReadStream({valueEncoding: 'json'});
        var found = false;
        var out = s.pipe(through.obj(function(data, enc, next) {
          if(!data || !data.value || !data.value.label) return next()
          if(data.value.label.humanID == humanID) {
            found = true;
            cb(null, data.value);
          } else {
            next();
          }
        }));
        
        s.on('end', function() {
          if(!found) {
            found = true;
            cb(null, null);
          }
        });

        s.on('error', function(err) {
          if(!found) {
            found = true;
            cb(err);
          }
        });
      },
      
      // TODO use indexes for this
      getVirtualBy: function(curUser, field, value, cb) {

        var s = virtualDB.createReadStream({valueEncoding: 'json'});
        var found = false;
        var out = s.pipe(through.obj(function(data, enc, next) {
          if(!data || !data.value || !data.value[field]) return next()
          if(data.value[field] == value) {
            found = true;
            cb(null, data.value);
            s.destroy();
          } else {
            next();
          }
        }));
        
        s.on('end', function() {
          if(!found) {
            found = true;
            cb(null, null);
          }
        });

        s.on('error', function(err) {
          if(!found) {
            found = true;
            cb(err);
          }
        });
      },

      // TODO use indexes for this!
      getBy: function(curUser, field, value, cb) {
        return getBy(field, value, cb);
      },

      // TODO doesn't work
      recentChanges: rpc.syncReadStream(function() {
        var s = recentDB.createReadStream({valueEncoding: 'utf8'});

        var count = 0;
        var out = s.pipe(through(function(data, enc, cb) {

          bioDB.get(data.value, function(err, p) {
            if(!err && p) {
              this.push(JSON.stringify(p));
              count++;
            }
            if(count < 50) {
              cb();
            }
          }.bind(this));
        }));
        
        out.on('error', function(err) {
          // TODO handle
          console.error("recent changes stream error:", err);
        });
        return out;
      }),

      search: function(curUser, q, cb) {
        console.log("CALLED SEARCH:", q);
        var s = bioDB.createReadStream({valueEncoding: 'json'});

        var ret = [];

        var out = s.pipe(through.obj(function(data, enc, next) {
          if((data.value.name && data.value.name.toLowerCase().match(q.toLowerCase())) || (data.value.description && data.value.description.toLowerCase().match(q.toLowerCase()))) {
            // skip stuff beginning with underscore
            if(data.value.name && data.value.name[0] === '_') {
              return;
            }
            // this.push(data.value);
            ret.push(data.value);
          }
          
          next();
        }));
        
        s.on('error', function(err) {
          cb(err);
        });
        s.on('end', function() {
          console.log("SENDING:", ret);
          cb(null, ret);
        });
      }

    },



  }, 'group'), {
    // the opts for rpc-multistream
    objectMode: true, // default to object mode streams
    debug: false
  });


  rpcServer.on('error', function(err) {
    console.error("Connection error (client disconnect?):", err);
  });


  rpcServer.pipe(stream).pipe(rpcServer);
});

