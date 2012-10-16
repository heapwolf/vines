
var dgram = require('dgram');
var uuid = require('uuid');
var ip = require('./common/ip');
var diff = require('./common/diff');

Timers = {};

var Timer = function Timer(timeout, uuid, callback) {

  if(!(this instanceof Timer)) {
    return Timers[uuid] = new Timer(timeout, uuid);
  }

  this.callback = callback;
  this.timeout = timeout;
  this.uuid = uuid;
};

Timer.prototype.start = function() {
  this.timer = setTimeout(this.callback, this.timeout);
};

Timer.prototype.stop = function() {
  clearTimeout(this.timer);
  delete Timers[this.uuid];
};

Timer.prototype.reset = function() {
  clearTimeout(this.timer);
  this.start();
};

var Vine = module.exports = function Vine(opts, callback) {

  if(!(this instanceof Vine)) {
    return new Vine(opts, callback);
  }

  var that = this;

  this.peers = {};
  this.defaultTimeout = opts.timeout || 1e4;

  var server = this.server = dgram.createSocket('udp4');

  var id = uuid.v4();

  //
  // A data structure representing the peer's important details.
  //
  this.details = { 

    uuid: id,
    address: ip.externalAddress(),
    port: opts.port || 8992,

    alive: true,
    lifetime: 0,
    timeout: defaultTimeout,
    heartBeatInterval: opts.hbInterval || 3e4,
    broadcastPeersInterval: opts.bpInterval || 6e4
  };

  this.peers[id] = this.details;

  server.on('message', this.receiveMessage);
  server.on('listening', callback.bind(server));

  setInterval(function() {
    ++that.lifetime;
  }, this.details.heartBeatInterval);

  setInterval(
    this.broadcastPeers,
    this.details.broadcastPeersInterval
  );
};

Vine.prototype.listen = function(port) {
  server.bind(port || this.details.port);
  return this;
};

Vine.prototype.broadcastPeers = function() {

  ++this.lifetime;

  var peer = this.randomPeer();

  var msg = {

    meta: { 
      type: 'list'
    },
    data: this.peers 
  };

  var message = new Buffer(JSON.stringify(msg));

  var vine = dgram.createSocket('udp4');

  vine.send(

    message,
    0,
    message.length, 
    peer.port, 
    peer.address, 
    function(err, bytes) {
      vine.close();
    }
  );

  return this;
};

Vine.prototype.receive = function(msg, rinfo) {

  var that = this;

  try {
    msg = JSON.parse(msg);
  }
  catch(ex) {
    return false;
  }

  if (!msg.meta && !msg.meta.type && !msg.meta.data) {
    return false; // not a message type we can understand.
  }

  // 
  // Merge remote list (received from peer), and our local member list.
  // Simply, we must update the heartbeats that the remote list has with
  // our list.  Also, some additional logic is needed to make sure we have 
  // not timed out a member and then immediately received a list with that 
  // member.
  // 
  var mergeLists = function(msg) {

  };

  if (msg.meta.type === 'list') {

    var peers = msg.data; // the message data is a list of peers.

    for (peerId in peers) {

      var knownPeer = this.peers[peerId]; // do we know this peer?

      if (knownPeer) {

        //
        // compare the lifetime of the peers.
        //
        if (peers[peerId].lifetime > knownPeer.lifetime) {

          if (peers[peerId].alive === false) {
            peers[peerId].alive = true; // revive this peer.
          }

          // update the peer with latest heartbeat
          knownPeer.lifetime = peers[peerId].lifetime;

          // and reset the timeout of that peer
          Timers[peerId].reset();
        }
      }
      else { // this is a new peer

        // add it to the peers list
        this.peers[peerId] = peers[peerId];

        // creat a timer for this peer
        var timeout = peers[peerId].timeout || this.defaultTimeout;
        
          Timer(timeout, peerId, function() {

          //
          // if we dont hear from this peer for a while
          // we will stop trying to broadcast to it unless
          // we hear from it again. We can also run some
          // arbitary user function.
          //
          that.peers[peerId].alive = false;
        });
      }
    }
  }

  return this;
};

Vine.prototype.randomPeer = function() {

  var keys = Object.keys(this.peers);

  for (var i = 0, attempts = 10; i < l i++) {

    var randomKey = Math.random() * keys.length;
    var randomPeer = this.peers[randomKey];
    var isAlive = randomPeer.alive;
    var isDifferent = randomPeer.uuid !== this.details.uuid;

    if (isDifferent && isAlive) {
      return this.peers[randompeer];
    }
  }

  return this;
};
