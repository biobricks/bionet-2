
var DC = require('discovery-channel')
var xtend = require('xtend');


function discover(opts, cb) {
  if(!(this instanceof discover)) return new discover(opts, cb);

  if(typeof opts === 'function') {
    cb = opts;
    opts = {};
  }

  opts = xtend({
    channel: 'bionet-nodes',
    port: '443',
    dhtInterval: 10 * 60 * 1000,
    dnsInterval: 60 * 1000 
  }, opts || {});

  this.opts = opts;
  this.opts.port = parseInt(this.opts.port)

  this.nodes = {};

  var self = this;

  console.log(this.opts);

  this.channel = DC({
    dht: {interval: this.opts.dhtInterval},
    dns: {interval: this.opts.dnsInterval}
  });

  
  this.channel.join(this.opts.channel, this.opts.port, function(err, peers) {
    if(err) return cb(err);
    
    if(peers) {
      console.log(peers);
    }
  });
  
  this.channel.on('peer', function(id, peer, type) {
    var nodeID = peer.host+':'+peer.port;
    self.nodes[nodeID] = new Date().getTime();
    cb(null, peer, type);
  });

  this.peers = function() {
    var key, tmp;
    var nodes = [];
    for(key in this.nodes) {
      tmp = this.nodes[key].split(':');
      nodes.push({
        host: tmp[0],
        port: tmp[1]
      });
    }
    return nodes;
  };

  this.stop = function() {
    this.channel.leave(this.opts.channel, this.opts.port);
  };

  this._clean = function() {
    var t = new Date().getTime();
    var key;
    for(key in self.nodes) {
      if(t - self.nodes[key] > self.opts.dhtInterval) {
        delete self.nodes[key];
      }
    }
  };
  
  setInterval(this._clean, Math.round(this.opts.dhtInterval * 1.5));
}


module.exports = discover;
