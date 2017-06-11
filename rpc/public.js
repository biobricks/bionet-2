
// TODO should re-use mailer from cmd.js
var mailer = new Mailer(settings.mailer, settings.baseUrl);

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

    search: rpc.syncReadStream(function(curUser, q, cb) {
      var s = db.bio.createReadStream({valueEncoding: 'json'});

      return s.pipe(through.obj(function(data, enc, next) {
        if(!data.value.isPublic) return next();
        if((data.value.name && data.value.name.toLowerCase().match(q.toLowerCase())) || (data.value.description && data.value.description.toLowerCase().match(q.toLowerCase()))) {
          // skip stuff beginning with underscore
          if(data.value.name && data.value.name[0] === '_') {
            return;
          }

          ret.push(data.value);
        }
        
        next();
      }));

    })

  }
}
