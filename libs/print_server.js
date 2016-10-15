

var fs = require('fs');
var path = require('path');
var ssh2 = require('ssh2');
var buffersEqual = require('buffer-equal-constant-time');
var ndjson = require('ndjson');

var settings;

function log(str) {
    console.log('[printserver] ' + str);
}

function logError(str) {
    console.error('[printserver] ' + str);
}

/* 
  This server understands two commands:

  msgChannel clientID

    Open a JSON-based duplex message channel between client and server
    that stays open for the duration of the connection.
    The client ID is a human-readable identifier for the client.
    It must be unique within all clients connecting to the server
    and does never changes for that client.
    It can contain only [\w\d\.\-_]+ 
    It will be displayed in the UI.

    The clients will send a periodic message: {type: "heartbeat"}
    The server must respond with the same message: {type: "heartbeat"}

    The server will send a message when it wants the client to print a label:

      {type: "print", filename: "labelFilenameOnServer.png"}

    The client will respond to this message by sending the getLabel command
    with the filename specified in the message.

    The client will send a message when a label has been printed:

      {type: "labelPrinted", filename: "labelFilenameOnServer.png"}

  getLabel filename

     Request that the server sends a binary stream with the label 
     png file data identified by filename and then closes the stream.

*/

// clients indexed by their IDs
var clients = {};

function Client(client, session) {
    this.client = client;
    this.session = session;
    this.id = undefined;

    this.outStream = null;
    this.inStream = null;

    this.client.on('end', function() {
        if(clients[this.id]) {
            log("client " + this.id + " disconnected");
            delete clients[this.id];
        }
    }.bind(this));

    this.session.on('exec', function(accept, reject, info) {
        var m;
        console.log("got command:", info.command);
        if(m = info.command.match(/^msgChannel\s+([\w\d\.\-_]+)/)) {
            var stream = accept();
            this.id = m[1];
            log("got id: " + info.command);
            clients[this.id] = this;
            this.msgChannelCmd(stream);
        } else if(m = info.command.match(/^getLabel\s+([\w\d\.\-_]+)/)) {
            var stream = accept();
            var filename = m[1];
            console.log("getLabel:", filename);
            this.getLabelCmd(stream, filename);
            
        } else {
            console.log("bad");
            reject();
            return;
        }
    }.bind(this));

    this.msgChannelCmd = function(stream) {
        log("message channel opened");
        
        this.inStream = stream.pipe(ndjson.parse());
        var jsonStream = ndjson.serialize();
        jsonStream.pipe(stream);
        this.outStream = jsonStream;

        this.inStream.on('data', function(msg) {
            if(msg.type === 'heartbeat') {
                this.sendHeartbeat();
            } else {
                log("Received unknown message with type: " + String(type));
                return;
            }
        }.bind(this));
    };

    this.sendHeartbeat = function() {
        if(!this.outStream) return;
        this.outStream.write({type: 'heartbeat'});
    };
    
    // tell the client that we have a label available for printing
    this.printLabel = function(filename, cb) {
        if(!this.outStream) return cb("message channel not open (client disconnected or not yet connected)");
        
        this.outStream.write({type: 'print', filename: filename});
    };

    this.getLabelCmd = function(stream, filename) {
        log("getLabelCmd: " + filename);

        var filePath = path.join(settings.labelImageFilePath, filename);
        
        var labelStream = fs.createReadStream(filePath);
        
        labelStream.on('data', function(data) {
            console.log("data:", data.length);
        });
        
        labelStream.on('error', function(err) {
            logError(err);
            stream.stderr.write("Error reading file\n");
            stream.exit(1);
            stream.end();
        });
        labelStream.on('end', function() {
            stream.exit(0);
            stream.end();
        });
        labelStream.pipe(stream);
    };


}

var printServer = {

    start: function(settingsOpt, opts, cb) {
        if(typeof opts === 'function') {
            cb = opts;
            opts = {};
        }
        settings = settingsOpt;

        if(!settings.printing.hostKey || !settings.printing.clientKey) return cb("Missing host or client key. Printserver not started.");
        
        var pubKey = ssh2.utils.genPublicKey(ssh2.utils.parseKey(fs.readFileSync(settings.printing.clientKey)));
        
        var serv = new ssh2.Server({
            hostKeys: [fs.readFileSync(settings.printing.hostKey)]
        }, function(client) {
            log('client connected!');

            client.on('error', function(err) {
                log('error:', err);
            });
            
            client.on('authentication', function(ctx) {
                if(ctx.method === 'publickey') {
                    if(ctx.key.algo === pubKey.fulltype && buffersEqual(ctx.key.data, pubKey.public)) {
                        ctx.accept();
                        return;
                    }
                }
                ctx.reject();
            });
            
            client.on('ready', function() {
                log('client authenticated!');
                
                client.on('session', function(accept, reject) {
                    var session = accept();
                    log("session accepted");

                    var c = new Client(client, session)

                });
            });

            client.on('end', function() {
                log("client disconnected");
            });
            
        });
        var listenHost = settings.printing.serverHost || settings.hostname;
        serv.listen(settings.printing.serverPort, listenHost, function() {
            log("listening on "+listenHost+":"+settings.printing.serverPort);
            cb();
        });
    },

    printLabel: function(filePath) {
        var key;
        // ToDo only print to one printer
        // ToDo proper callback
        for(key in clients) {
            clients[key].printLabel(filePath, function(err) {
                if(err) {
                    console.error("Printing failed for ", filePath, err);
                    return;
                }
                console.log("Printing:", filePath);
            })
        }
    }

};

// ToDo clean up after disconnect (remove key from clients var)

module.exports = printServer;
