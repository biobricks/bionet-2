

var routes = require('./routes.js');
var emailValidator = require('email-validator');
var passwordValidator = require('./password_validator.js');
var settings = require('../../settings.js')();

var LabelMaker = require('./labelmaker.js');
var QrCode = require('qrcode-reader');
var getUserMedia = require('getusermedia');
var rpc = require('./rpc.js');

var $ = window.$ // TODO require jqueryz
window.$.formToObject = require('form_to_object');
window.$.xtend = require('xtend'); // extend that does not modify arguments

var riot = require('riot');
window.riot = riot

import route from 'riot-route'
window.route = route;

var Cookies = require('js-cookie')
window.Cookies = Cookies

require('jquery.fancytree/dist/jquery.fancytree-all.js')
require('jquery.fancytree/dist/src/jquery.fancytree.dnd5.js')
require('jquery.fancytree/dist/src/jquery.fancytree.persist.js')

// TODO why can't we just do: var app = window.app = require('./app'); ?
import app from './app'
window.app = app // our one global variable (other than jquery)
app.rpc = rpc;
app.initialize() // must be called before UI elements are required

// ----- code below this point will call `app.` methods

var ui = require('./ui')

// TODO these should not be imported into the global scope!
// TODO: build plugins as separate modules and scan plugins folder for plugins to install
require('./ui/uitags.js')
require('./plugins/bionet')
require('./plugins/bionet-scanner')


// wait for everything to fully load
$(document).ready(function () {
  console.log("document ready")

app.startPlugins(function(err) {
  if(err) return console.error("Failed to initialize plugins:", err);




  // connect to the server and attempt to log in
  rpc.connect(function(err, remote, user) {
    if(err) {
      console.error("Connection attempt failed. Will continue trying.");
      return;
    }
//    app.startRouter();
    app.remote = remote;
    app.startRouter();
    // TODO
    // app.start() should be called here
    // but is currently called from ui/index.js 
    // since app.startPlugins doesn't have a callback

    console.log("remote:", remote)

    if(user) {
      console.log("Logged in as: ", user);
    } else {
      console.log("Not logged in");

    }

  });
});
});
