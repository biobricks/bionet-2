#!/usr/bin/env node

var printServer = require('../libs/print_server.js');
var settings = require("../settings.js");

printServer.start(settings, {
  // this test gets run whenever a client connects
  test: function(client) {
    client.printLabel("example.png", function(err) {
      if(err) return console.error(err);

      console.log("Label was sent to printer");
    });
  }
}, function(err) {
    if(err) return console.error(err);

    console.log("Printserver started");
});
