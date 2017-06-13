
var websocket = require('websocket-stream');
var async = require('async');
var backoff = require('backoff');
var rpc = require('rpc-multistream');
var auth = require('rpc-multiauth');
var distance = require('jeyo-distans');
var xtend = require('xtend');

function PeerConnector(peerID, hostname, port, rpcMethods, opts) {

  this.hostname = hostname;
  this.port = port;

  this.opts = opts || {}
  this.opts.maxAttempts = this.opts.maxAttempts || 10; // max reconnection attempts

  this.id = peerID; // this peer's identifier

  this.peers = {}; // connected peers
  this.urls = {}; // same as this.peers but indexed by peer.url

  this.rpcMethods = xtend(rpcMethods, {
      peerIdentifier: function(){}, // used to identify us as a peer
  });

  this._connectFail = function(peer) {
    peer.connected = false;
    
    console.log("_connectFail");

    peer.rpc.die(); // prevent a future 'death' event

    if(peer.attempts >= this.opts.maxAttempts || !peer.wasConnected || peer.stopTrying) {
//      if(peer.url === 'ws://172.30.0.26:8000/' || peer.url === 'ws://72.244.126.50:9009/') {
        console.log("FAIL FAIL:", peer.url, peer.attempts, this.opts.maxAttempts, peer.wasConnected, peer.stopTrying);
//      }
      if(this.urls[peer.url]) {
        //delete this.urls[peer.url];
        delete this.peers[peer.id];
      }
      return;
    }

    try {
      peer.backoff.backoff(); // start backoff timer if not already started
    } catch(e) {}
  };

  this._toUrl = function(hostname, port) {
    var prefix;
    if(this.port === 443) {
      prefix = 'wss://';
    } else {
      prefix = 'ws://';
    }
    return prefix+hostname+':'+port+'/';
  };


  this.ownUrl = this._toUrl(this.hostname, this.port);

  this._connectToPeer = function(peer) {
    var self = this;

    console.log("Connecting to:", peer.url);
    peer.attempts++;

    var stream = websocket(peer.url);

    var rpcMethods = xtend(self.rpcMethods, {

      // the other side can ask this side to stop reconnecting
      permanentlyDisconnect: function() {
        peer.stopTrying = true;
        peer.stream.socket.close();
      }
    });

    // null auth
    var rpcMethodsAuth = auth({
      userDataAsFirstArgument: true, 
      secret: 'unused',
      login: function(loginData, cb) {cb(new Error("login is impossible"))}
    }, rpcMethods, 'group');

    var rpcClient = rpc(rpcMethodsAuth, {
      objectMode: true,
      heartbeat: 5000,
      debug: false
    });

    rpcClient.pipe(stream).pipe(rpcClient);

    peer.stream = stream;
    peer.rpc = rpcClient;
    peer.incoming = false; // this is an outgoing connection

    rpcClient.on('methods', function(remote) {
      peer.connected = true;
      peer.backoff.reset(); // stop backoff timer

      peer.remote = remote;

      console.log("======================== CONNECTED TO", peer.url);
      peer.wasConnected = true;

      remote.getPeerInfo(function(err, info) {
        if(err) {
          console.error('[peer getPeerInfo error]', err);
          return peer.stream.socket.close();
        }
        console.log("GOT", info);
        peer.id = info.id;
        peer.name = info.name;
        peer.position = info.position;

        if(peer.position && self.opts.position) {
          peer.distance = distance(self.opts.position, peer.position);
        } else {
          peer.distance = Infinity;
        }

        self.peers[peer.id] = peer;
        self.urls[peer.url] = peer;
      });

    });

    stream.socket.on('close', function(code, reason) {
      if(code !== 1006) {
        console.log("[peer outgoing websocket closed]", peer.url, code, reason);
      }
      self._connectFail(peer);
    });

    stream.on('error', function(err) {

      // TODO are there any error codes that aren't cause for reconnecting?
      if(!err.message.match(/ECONNREFUSED/)) {
        console.log('[peer websocket]', peer.url, err.message || err);
      }
      self._connectFail(peer);
    });

    rpcClient.on('error', function(err) {
      console.log('[peer rpc]', peer.url, err.message || err);
      self._connectFail(peer);
    });

    rpcClient.on('death', function() {
      console.log('[peer rpc death]', peer.url);
      self._connectFail(peer);
    });
  };
 
  // -------------------------
  // public functions below
  // -------------------------

  this._attemptConnection = function(peer) {
    var self = this;

    peer.url = this._toUrl(peer.hostname, peer.port);
    
    // don't connect to ourselves
    if(peer.url === this.ownUrl) {
      return;
    }

    console.log("WANT TO ATTEMPT:", peer.url);
    console.log(this.urls[peer.url] ? "  already connected" : "  not yet connected");

    // alredy connected to this peer
    if(this.urls[peer.url]) return;

    if(peer.id && this.peers[peer.id]) {
      delete this.urls[peer.url];
      delete this.peers[peer.id];
    }

    if(peer.stream) stream.socket.close();
    peer.connected = false;
    peer.attempts = 0;

    var bo = backoff.fibonacci({
      randomisationFactor: 0,
      initialDelay: 1000,
      maxDelay: 30000
    });

    // reached backoff timeout
    bo.on('ready', function(number, delay) {
      console.log("RETRYING");
      this._connectToPeer(peer);
    }.bind(this));

    peer.backoff = bo;

    this._connectToPeer(peer);
  };

  this.registerIncoming = function(remote, peerInfo, stream, rpc, cb) {
    var self = this;
    var peer = this.peers[peerInfo.id];

    // TODO check options and reject if e.g. hostname or port missing

    console.log("INCOMING:", peerInfo);

    if(peer) {
      if(peer.connected && !peer.incoming) {
        var err = new Error("You already have an active connection to this peer in the other direction (initiated by the peer).")
        err._permaFail = true;
        return cb(err);
      }
      // cancel any existing connection attempt
      if(peer.stream) stream.socket.close();
      if(peer.backoff) backoff.reset();
    }

    peer = {
      remote: remote,
      id: peerInfo.id,
      url: this._toUrl(peerInfo.hostname, peerInfo.port),
      rpc: rpc,
      stream: stream,
      incoming: true, // peer connected to us (rather than us connecting to peer)
      connected: true,
      wasConnected: true,
      name: peerInfo.name,
      position: peerInfo.position
    };

    if(peer.position && self.opts.position) {
      peer.distance = distance(self.opts.position, peer.position);
    } else {
      peer.distance = Infinity;
    }

    console.log("==================== INCOMING established:", peer.url);

    stream.socket.on('close', function(code, reason) {
      console.log("[peer incoming connection closed]", code, reason);
      delete self.peers[peer.id];
      delete self.urls[peer.url];
    });

    this.peers[peer.id] = peer;
    this.urls[peer.url] = peer;

    cb();
  };

  // call a function for each connected peer
  this.peerDo = function(f, cb) {
    async.each(this.peers, function(peer, cb) {
      if(!peer.connected) return cb(); // skip if disconnected
      f(peer, cb);
    }, cb);
  };

  this.connect = function(peer) {
    this._attemptConnection(peer);
//    if(!this.initialPeers) return;
//    var i;
//    for(i=0; i < this.initialPeers.length; i++) {
//      this._attemptConnection(this.initialPeers[i]);
//    }
//  }; 
  };

/*
  setInterval(function() {
    var key;
    for(key in this.urls) {
      console.log("    ~~~~~~~~~~~", key);
    }
    
  }.bind(this), 3000);
*/
};



module.exports = PeerConnector;


