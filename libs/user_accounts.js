
var emailValidator = require('email-validator');

var uuid = require('uuid').v4;
var through = require('through2');

var accounts = {

    findUserBy: function(users, key, value, cb) {
        var s = users.list();
        s.on('end', function() {
            cb(null, null);
        });
        s.on('error', cb);
        s.pipe(through.obj(function(row, enc, next) {
            var id = row.key;
            var user = row.value;

            if(user[key] && (user[key] == value)) {
                s.destroy();
                cb(null, id, user)
            } else {
                next();
            }
        }));
    },
        
    checkEmail: function(email, cb) {
        if(!email.match('@')) return cb("Not a valid email address");
        // ToDo proper email check
        // should dig for A record and if not found then MX record
        cb();
    },

    create: function(users, user, password, mailer, cb) {
        if(!user.email) return cb("User must have an email address");
        
        user.email = user.email.toLowerCase();

        if(!emailValidator.validate(user.email)) {
            return cb("Invalid email address");
        }

        var opts = {
            login: {basic: {username: user.email, password: password}},
            value: {
                email: user.email, 
                name: user.name,
                workbenchID: user.workbenchID,
                verified: false,
                verificationCode: uuid(),
                created: (new Date()).value
            }
        };

        users.create(user.email, opts, function(err) {
            if(err) {
                var msg;
                if(err.type == 'EXISTS') {
                    return cb(new Error("User already exists"));
                } else {
                    return cb(err);
                }
            }
          console.log("USER CREATED, sending verification", user, opts.value.verificationCode);
          if(mailer) {
            mailer.sendVerification(user, opts.value.verificationCode, cb);
          } else {
            cb();
          }
        });
    },

    // update user value
    update: function(users, userValue, cb) {
      users.get(userValue.email, function(err, value) {
        if(err) return cb(err);

        users.put(userValue.email, userValue, cb);
      });
    },

    verify: function(users, code, cb) {
        accounts.findUserBy(users, 'verificationCode', code, function(err, id, user) {
            if(err) return cb(err);
            
            if(!id) return cb("Invalid verification code");

            user.verified = new Date();
            delete user.verificationCode;

            users.put(id, user, function(err) {
                if(err) return cb("Error updating user info");
                cb();
            });
        });
    },

    checkLogin: function(users, email, password, cb) {
        email = email.toLowerCase();

        var creds = {username: email, password: password};
        users.verify('basic', creds, function(err, ok, id) {
            if(err) return cb("Login error: ", err);
            if(!ok) return cb("Login failed: Wrong email or password");
            cb(null, id);
        });
    },


    updatePassword: function(users, email, oldpassword, password, cb) {
        accounts.verify(users, email, oldpassword, function(err) {
            if(err) return cb("Updating password failed: " + err);
            accounts.updatePasswordUnsafe(users, email, password, cb);
        });
    },

    updatePasswordUnsafe: function(users, email, password, cb) {
        users.removeLogin(email, 'basic', function (err) {
          // TODO this should not be possible
            if(err) return cb("PANIC! Updating password failed catastrophically and now the user '"+email+"' was accidentally deleted: " + err);
            users.addLogin(email, 'basic', {
                username: email,
                password: password
            }, function(err) {
                if(err) return cb("Updating password failed: " + err);
                cb(null);
            });
        });
    },

    requestPasswordReset: function(users, mailer, emailOrName, cb) {
        var findBy;
        if(emailOrName.match('@')) {
            findBy = 'email';
        } else {
            findBy = 'name';
        }

        accounts.findUserBy(users, findBy, emailOrName, function(err, id, user) {
            if(err) return cb(err);
            if(!id) return cb("User not found");

            // ToDo add creation date
            user.passwordResetCode = uuid();

            users.put(user.email, user, function(err) {
                if(err) return cb("Password reset failed: " + err);

                mailer.sendPasswordReset(user, user.passwordResetCode, function(err) {
                    if(err) return cb("Failed to send email: " + err);
                    
                    cb();
                });
            });
        });
    },

    checkPasswordResetCode: function(users, resetCode, cb) {
        accounts.findUserBy(users, 'passwordResetCode', resetCode, function(err, email, user) {
            if(err || !email) return cb("Invalid password reset link. Try copy-pasting the URL instead of clicking it");
            cb(null, user);
        });
    },

    completePasswordReset: function(users, resetCode, password, cb) {
        accounts.checkPasswordResetCode(users, resetCode, function(err, user) {
            if(err) return cb(err);
            accounts.updatePasswordUnsafe(users, user.email, password, function(err) {
                if(err) return cb(err);
          
                delete user.passwordResetCode;
      
                users.put(user.email, user, function(err) {
                    if(err) return cb("Password reset failed. Could not update user database.");

                    cb();
                });
            });
        });
    }

};

module.exports = accounts;
