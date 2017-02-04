var $ = window.$



import app from './app'
window.app = app // our one global variable
app.initialize()
require('./ui/uitags.js')

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
var rpc = require('rpc-multistream'); // RPC and multiple streams over one stream
var auth = require('rpc-multiauth'); // authentication
var through = require('through2'); // stream helper

var reconnectDelay = 2;
var reconnectAttempts = 0;
var reconnectAttemptsMax = 10;

function reconnect() {
    if (reconnectAttempts > reconnectAttemptsMax) {
        console.log("Disconnected from server. Gave up trying to reconnect after " + reconnectAttemptsMax + " attempts.", {
            level: 'error',
            time: false
        });
        return;
    }
    var delay = Math.pow(reconnectDelay * reconnectAttempts, 2);
    if (reconnectAttempts) {
        console.log("Disconnected from server. Attempting to reconnect in " + delay + " seconds", {
            level: 'error',
            time: (delay - 1) * 1000
        });
    }
    console.log("reconnecting in", delay, "seconds");
    setTimeout(connect, delay * 1000);
    reconnectAttempts++;
}


function connector(cb) {

    var failed = false;

    function failOnce(err) {
        console.log('main.js failOnce error:', (typeof err === 'object') ? err.message + ' ' + err.stack : err);
        if (!failed) {
            cb(err);
            failed = true;
        }
    }

    var wsProtocol = 'ws://';
    if(window.location.protocol.match(/^https/i)) {
        wsProtocol = 'wss://';
    }

    var websocketUrl = wsProtocol + window.document.location.host;
    console.log('connecting to websocket', websocketUrl)

    var stream = websocket(websocketUrl);
    stream.on('error', failOnce);

    // You can turn on debugging like this:
    //   var rpcClient = rpc(null, {debug: true});
    var rpcClient = rpc(null, {
        objectMode: true
    });

    rpcClient.pipe(stream).pipe(rpcClient);

    rpcClient.on('error', failOnce);

    rpcClient.on('methods', function (remote) {

        // automatically try to authenticate when connecting
        auth.authenticate(remote, {
            setCookie: true
        }, function (err, userData) {
            if (err) {
                console.log("Not logged in");
                app.dispatch('loginState', false);
                cb(null, remote);
            } else {
                console.log("Logged in as: ", userData.user.email);
                app.dispatch('loginState', true);
                cb(null, remote, userData.user);
            }
        });

    });
}

// ToDo get rid of these globals
function connect() {
    console.log("attempting to connect");
    connector(function (err, remote, user) {
        if (err) {
            console.log("connection attempt failed");
            reconnect();
            return;
        }
        if (reconnectAttempts) {
            console.log("Reconnected!");
        }
        app.remote = remote;
        app.user = user;
        app.startPlugins();
        reconnectAttempts = 0;
    })
}

app.login = function (email, password, cb) {
    console.log("login initiated");

    auth.login(app.remote, {
        email: email,
        password: password
    }, {
        setCookie: true
    }, function (err, token, userData) {
        if (err) return cb(err);
        app.user = userData.user;

        console.log("login successful! token: " + token + " userData: " + JSON.stringify(userData));

        cb(null, app.user);

    });
};

app.logout = function (cb) {
    cb = cb || function () {};

    auth.logout(app.remote, function () {
        app.user = undefined;
        console.log("Logged out.");
        cb();
    });

};

$(document).ready(function () {

    console.log("document ready")
    connect();

});
