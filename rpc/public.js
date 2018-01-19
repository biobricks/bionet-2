
var through = require('through2');
var rpc = require('rpc-multistream'); // rpc and stream multiplexing

module.exports = function(settings, users, accounts, db, index, mailer, p2p) { 
  return {

    getPeerInfo: function(curUser, cb) {
      cb(null, {
        id: settings.baseUrl,
        hostname: settings.hostname,
        port: settings.port,
        name: settings.lab,
        position: settings.physicalPosition
      });
    },

    foo: function(curUser, user, cb) {
      //console.log("foo called");
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
        if(err) {
          console.log("ACCOUNT CREATE ERROR:", err);
          return cb(err);
        }

        db.ensureUserData(users, user, accounts, cb)
     });
    }, 

    search: function(curUser, q, cb) {
      console.log("CALLED SEARCH:", q);
      var s = db.bio.createReadStream({valueEncoding: 'json'});

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
    },

    // TODO switch to using a stream as output rather than a callback
    peerSearch: function(curUser, query, cb) {
      if(!p2p) return cb(new Error("p2p not supported by this node"));

      function onError(err) {
        // do we really care about remote errors? probably not
      }

      // for each connected peer
      p2p.connector.peerDo(function(peer, next) {

        // run a streaming blast query
        var s = peer.remote.searchAvailable(query);

        s.on('error', onError);

        s.on('data', function(data) {
          cb(null, {
            id: peer.id,
            name: peer.name,
            position: peer.position,
            distance: peer.distance
          }, data);
        });

        // TODO time out the search after a while

        next();

      }, function(err) {
        if(err) return cb(err);
      });
    },

    searchAvailable: rpc.syncReadStream(function(curUser, q, cb) {
      var s = db.physical.createReadStream({valueEncoding: 'json'});

      return s.pipe(through.obj(function(data, enc, next) {
//        if(!data.value.isPublic) return next();
//        if(!data.value.isAvailable) return next();

        if((data.value.name && data.value.name.toLowerCase().match(q.toLowerCase())) || (data.value.description && data.value.description.toLowerCase().match(q.toLowerCase()))) {
          // skip stuff beginning with underscore
          if(data.value.name && data.value.name[0] === '_') {
            return;
          }

          this.push(data.value);
        }
        
        next();
        
      }));
    }),

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

    blast: rpc.syncReadStream(function(curUser, query) {
      if(!index.blast) throw new Error("BLAST queries not supported by this node");
      return index.blast.query(query);
    }),

    // TODO should have some kind of validation / security / rate limiting
    requestMaterialRemote: function(curUser, id, requesterEmail, physicalAddress, cb) {

      db.physical.get(id, function(err, m) {
        if(err) return cb(err);

        mailer.sendMaterialRequest(m, requesterEmail, physicalAddress, cb);
      });
    }

  }
}
