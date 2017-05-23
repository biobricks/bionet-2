
module.exports = function(db, users) {

  return function(loginData, cb) {
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
        
        ensureUserData(users, user, function(err, user) {
        if(err) return cb(err);            
          
          // ToDo don't hard-code group
          cb(null, id, {user: user, group: 'user'});
        });
      });
    });
  }
}


