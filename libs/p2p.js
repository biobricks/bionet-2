var PeerConnector = require('../libs/peer_connector');
var PeerDiscover = require('../libs/peer_discovery');

module.exports = function(settings) {

  if(!settings.dhtChannel) {
    return;
  }

  return {
    connector: new PeerConnector(settings.baseUrl, settings.hostname, settings.port, {ssl: settings.ssl}),
  
    discoverer: new PeerDiscover({
      channel: settings.dhtChannel,
      port: settings.port
    }, function(err, peer, type) {
      if(err) {
        // TODO
        // We sometimes initially get:
        // "Peer discovery error: Error: No nodes to query" 
        // but then it seems to proceed to work correctly
        // or possibly only DNS discovery works after this.
        // The error originates in the bittorrent-dht .announce function
        return;
      }
      
      peerConnector.connect({
        hostname: peer.host,
        port: peer.port
      });
      
    })
  }
}
