#!/usr/bin/env node

var labDeviceServer = require('../libs/lab_device_server.js');
var settings = require("../settings.js");

labDeviceServer.start(settings, {
  // this test gets run whenever a client connects
  test: function(client, clientInfo) {
    if(clientInfo.type === 'printer') {
      client.printLabel("example.png", function(err) {
        if(err) return console.error(err);
        
        console.log("Label was sent to printer");
      });
    }
  }
}, function(err) {
    if(err) return console.error(err);

    console.log("Lab device server started");
});
