#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var http = require('http');
var util = require('util');
var router = require('routes')(); // server side router
var websocket = require('websocket-stream');
var rpc = require('rpc-multistream'); // rpc and stream multiplexing
var auth = require('rpc-multiauth'); // auth
var level = require('level'); // leveldb database
var sublevel = require('subleveldown'); // leveldb multiplexing
var accountdown = require('accountdown'); // user/login management
var uuid = require('uuid').v4;
var through = require('through2');
var accounts = require('../libs/user_accounts.js');
var printServer = require('../libs/print_server.js');
var Mailer = require('../libs/mailer.js');
var IDGenerator = require('../libs/id_generator.js'); // atomically unique IDs

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
    gzip: true
});

settings.userFilePath = path.join(__dirname, '..', settings.userFilePath);
var userStatic = require('ecstatic')({
    root: settings.userFilePath,
    baseDir: 'user-static',
    gzip: true,
    cache: 0
});
settings.labelImageFilePath = path.resolve(path.join(settings.userFilePath, settings.labelImageFilePath));


var bioDB = level('./db/bio');

var uDB = level('./db/users');
var userDB = sublevel(uDB, 'accountdown', { valueEncoding: 'json' });
var users = accountdown(userDB, {
    login: { basic: require('accountdown-basic') }
});


var indexDB = level('./db/indexes');
var recentDB = sublevel(indexDB, 'changed', { keyEncoding: 'utf8', valueEncoding: 'utf8' });

var miscDB = level('./db/misc');
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


function createMaterialInDB(m, cb) {
  idGenerator.getCur(function(err, curID) {
    if(err) return cb(err);

    // TODO check for human readable id
//  if(!m.humanID || m.humanID > curID) {
//    return cb("missing or invalid human readable ID");
//  }

    // TODO should we ever generate these on the server?
    m.id = m.id || uuid();
    m.updated = m.updated || new Date()

    bioDB.put(m.id, m, {valueEncoding: 'json'}, function(err) {
      if(err) return cb(err);
      addToIndex(m);
      cb(null, m.id);
    });
  })
}

websocket.createServer({server: server}, function(stream) {

    var rpcServer = rpc(auth({
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
        
        foo: function(cb) {
            console.log("foo called");
            cb(null, "foo says hi");
        },

        checkMasterPassword: function(password, cb) {
            if(password != settings.userSignupPassword) {
                return cb("Invalid master password");
            }
            cb();
        },

        createUser: function(email, password, opts, cb) {
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
            accounts.create(users, user, password, mailer, cb);
        }, 

        verifyUser: function(code, cb) {
            accounts.verify(users, code, cb);
        }, 

        requestPasswordReset: function(emailOrName, cb) {
            accounts.requestPasswordReset(users, mailer, emailOrName, cb);
        }, 

        checkPasswordResetCode: function(resetCode, cb) {
            accounts.checkPasswordResetCode(users, resetCode, cb);
        },

        completePasswordReset: function(resetCode, password, cb) {
            accounts.completePasswordReset(users, resetCode, password, cb);
        },

        user: { // only users in the group 'user' can access this namespace
            secret: function(cb) {
                cb(null, "Sneeple are real!");
            },

            getID: function(cb) {
                idGenerator.next(cb);
            },

            delMaterial: function(id, cb) {
                if(!id) return cb("Missing id");
                
                bioDB.del(id, cb);
            },

            saveMaterial: function(m, imageData, doPrint, cb) {
                if(!m.id) m.id = uuid();

                var mtch;
                if(imageData && (mtch = imageData.match(/^data:image\/png;base64,(.*)/))) {

                    var imageBuffer = new Buffer(mtch[1], 'base64');
                    // TODO size check
                    var imagePath = path.join(settings.labelImageFilePath, m.id+'.png')
                    fs.writeFile(imagePath, imageBuffer, function(err) {
                        if(err) return cb(err);


                        m.newPhysical.labelImagePath = imagePath;
                        m.physicals = m.physicals || [];
                        m.physicals.push(m.newPhysical);
                        delete m.newPhysical

                        createMaterialInDB(m, function(err, id) {
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
                    createMaterialInDB(m, cb);
                    console.log("saved with no file");
                }
                
                console.log("saving:", m);
            },

            getMaterial: function(id, cb) {
                console.log("getting:", id);
                bioDB.get(id, {valueEncoding: 'json'}, function(err, p) {
                  console.log("!! GOT:", p);
                    if(err) return console.log(err);
                    cb(null, p);
                });
            },

            getMaterialByHumanID: function(humanID, cb) {


                var s = bioDB.createReadStream({valueEncoding: 'json'});
                var found = false;
                var out = s.pipe(through.obj(function(data, enc, next) {
                    if(data.value.humanID == humanID) {
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

            // TODO doesn't work
            recentChanges: rpc.syncReadStream(function() {
                var s = recentDB.createReadStream({valueEncoding: 'utf8'});

                var count = 0;
                var out = s.pipe(through(function(data, enc, cb) {
                    console.log("data.value", data.value);
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

            search: rpc.syncStream(function(q) {
                var s = bioDB.createReadStream({valueEncoding: 'json'});


                var out = s.pipe(through.obj(function(data, enc, cb) {
                    if((data.value.name && data.value.name.toLowerCase().match(q.toLowerCase())) || (data.value.description && data.value.description.toLowerCase().match(q.toLowerCase()))) {
                        this.push(data.value);
                    }
                   
                    cb();
                }));
                
                out.on('error', function(err) {
                    // TODO handle
                    console.error("search stream error:", err);
                });
                return out;
            })

        },



    }, 'group'), {
        // the opts for rpc-multistream
        objectMode: true // default to object mode streams
    });


    rpcServer.on('error', function(err) {
        console.error("Connection error (client disconnect?):", err);
    });


    rpcServer.pipe(stream).pipe(rpcServer);
});

