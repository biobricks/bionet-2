
var websocket = require('websocket-stream');
var async = require('async');
var backoff = require('backoff');
var rpc = require('rpc-multistream');

function PeerConnector(initialPeers, opts) {

  this.initialPeers = initialPeers;

  // websocket instances
  this.peers = {};

  this.attemptConnection = function(peer) {
    var self = this;

    if(this.peers[peer.peerUrl]) {
      delete this.peers[peer.peerUrl];
    }

    if(peer.stream) stream.destroy();
    peer.connected = false;

    var bo = backoff.fibonacci({
      randomisationFactor: 0,
      initialDelay: 1000,
      maxDelay: 30000
    });

    // reached backoff timeout
    bo.on('ready', function(number, delay) {
      self.connectToPeer(peer);
    });

    peer.backoff = bo;

    this.connectToPeer(peer);
  };

  this.connectToPeer = function(peer) {
    console.log("Connecting to:", peer.url);

    var stream = websocket(peer.url);

    var rpcClient = rpc(null, {
      objectMode: true,
      heartbeat: 5000
    });

    rpcClient.pipe(stream).pipe(rpcClient);

    peer.stream = stream;
    peer.rpc = rpcClient;

    rpcClient.on('methods', function(remote) {
      peer.connected = true;

      peer.backoff.reset(); // stop backoff timer

      console.log("CONNECTED TO", peer.url);
    });

    stream.on('error', function(err) {
      // TODO are there any error codes that aren't cause for reconnecting?

      console.log('[peer websocket]', peer.url, err.code || err);

      peer.rpc.die(); // prevent a future 'death' event
      try {
        peer.backoff.backoff(); // start backoff timer if not already started
      } catch(e) {}
    });

    rpcClient.on('error', function(err) {
      console.log('[peer rpc]', peer.url, err);
      peer.connected = false;

      peer.rpc.die(); // prevent a future 'death' event
      try {
        peer.backoff.backoff(); // start backoff timer if not already started
      } catch(e) {}
    });

    rpcClient.on('death', function() {
      console.log('[peer rpc death]', peer.url);
      peer.connected = false;
      try {
        peer.backoff.backoff(); // start backoff timer if not already started
      } catch(e) {}
    });

    this.peers[peer.url] = peer;
  };
   
  // call a function for each connected peer
  this.peerDo = function(f, cb) {
    async.eachSeries(peers, function(peer, cb) {
      if(!peer.rpc) return cb(); // skip if disconnected
      f(peer, cb);
    }, cb);
  };
 

  this.connect = function() {
    if(!this.initialPeers) return;
    var i;
    for(i=0; i < this.initialPeers.length; i++) {
      this.attemptConnection(this.initialPeers[i]);
    }
  }; 

};



module.exports = PeerConnector;


