var $ = window.$

import app from './app'
window.app = app // our one global variable
app.initialize()
require('./ui/uitags.js')

var rpc = require('./rpc.js');

// install plugins
// todo: build plugins as separate modules and scan plugins folder for plugins to install
require('./plugins/bionet')
require('./plugins/bionet-scanner')
var ui = require('./ui')

var routes = require('./routes.js');

window.$.formToObject = require('form_to_object');
window.$.xtend = require('xtend'); // extend that does not modify arguments

var emailValidator = require('email-validator');
var passwordValidator = require('./password_validator.js');
var settings = require('../../settings.js');

var LabelMaker = require('./labelmaker.js');
var QrCode = require('qrcode-reader');
var getUserMedia = require('getusermedia');

// an auto-reconnecting stream over web http
//var reconnect = require('reconnect-core')(require('shoe')); 
var websocket = require('websocket-stream');
var through = require('through2'); // stream helper


$(document).ready(function () {

  console.log("document ready")

  rpc.connect(function(err, remote, user) {
    if(err) {
      console.error("Connection attempt failed. Will continue trying.");
      return;
    }

    if(!user) {
      console.log("Not logged in");
      app.setLoginState(false);
    } else {
      console.log("Logged in as: ", userData.user.email);
      app.setLoginState(true);
    }
    app.remote = remote;
    app.user = user;
    app.startPlugins();
  });
});
