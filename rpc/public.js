
var rpc = require('rpc-multistream'); // rpc and stream multiplexing

module.exports = function(settings, users, accounts, db, index, mailer) { 
  return {

    getPeerInfo: function(curUser, cb) {
      cb(null, {
        id: settings.baseUrl
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

    // TODO switch to using a stream as output rather than a callback
    peerBlast: function(curUser, query, cb) {
      var streams = [];

      function onError(err) {
        // do we really care about remote errors? probably not
      }

      function onResult(peerInfo, result) {
        cb(peerInfo, result);
      }

      if(index.blast) {
        streams.push({          
          stream: index.blast.query(query)
        });
      }

      // for each connected peer
      peerConnector.peerDo(function(peer, next) {

        // run a streaming blast query
        var s = peer.remote.blast(query)

        s.on('error', onError);

        s.on('data', function(data) {
          cb(null, peer.info, data);
        });
        streams.push(s);

        next();

      }, function(err) {
        if(err) return cb(err);
      });
    }

  }
}