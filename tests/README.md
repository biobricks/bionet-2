
This is a set of tests for the API exposed by the back-end over RPC.

# Writing tests

You probably want to start your test by connecting to the server. If you need to loged in for your test simply do:

```
var connect = require('./common/connect.js');

connect(function(err, done, remote, userData, token) {

  done(); // disconnect from server and finish test

});
```

if you don't want to be logged in then use `{login: false}` as the first argument:

```
connect({login: false}, function(err, done, remote) {

  done(); // disconnect from server and finish test

});


This will log you in using the test user created by the `./bin/db.js test` command.

You can also manually specify user credentials using like so:

```
connect({
  login: {
    email: 'me@foo.org',
    password: 'my-password'
  }
}, ... );
```

# Running tests

__WARNING!__ Running these tests will maul your database. It is recommend that you start with a new database.

If you haven't already, create the test user needed by some tests:

```
./bin/db.js user test
```

Remember to actually start the server first with `npm run start`, then run:

```
npm run apitest
```