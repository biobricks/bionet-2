
var net = require('net');
var multilevel = require('multileveldown'); // share one leveldb between processes

module.exports = function(settings, db) {

  var multiLevelServer = net.createServer(function(con) {
    con.pipe(multilevel.server(db.db)).pipe(con);

    con.on('error', function(err) {
      con.destroy();
      console.error("multilevel client error:", err);
    });

  }).listen({

    host: settings.dbHostname || 'localhost',
    port: settings.dbPort || 13377

  }, function(err) {
    if(err) return console.error("Failed to start multilevel:", err)
    console.log("multilevel listening");
  });

  multiLevelServer.on('error', function(err) {
    console.error("multilevel server error:", err);
  })


}
