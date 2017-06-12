
module.exports = function(db, users, accounts) {

  return function(loginData, cb) {
    console.log("login attempt:", loginData);
    creds = {
      username: loginData.email,
      password: loginData.password
    };

    
    users.verify('basic', creds, function(err, ok, id) {
      if(err) return cb(err)
      if(!ok) return cb(new Error("Invalid username or password"));
      
      users.get(id, function(err, user) {
        if(err) return cb(err);

        console.log("USER:", user);
        
        db.ensureUserData(users, user, accounts, function(err, user) {
          if(err) return cb(err);            
          
          // ToDo don't hard-code group
          console.log("ID:", id);
          cb(null, id, {user: user, group: 'user'});
        });
      });
    });

  }
}


