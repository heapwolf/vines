

var dgram = require('dgram');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var uuid = require('node-uuid');
var ip = require('./common/ip');
var diff = require('./common/diff');

Timers = {};

var clearTimers = function() {
  for(var timer in Timers) {
    clearTimeout(Timers[timer]);
    delete Timers[timer];
  }
};

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

  EventEmitter.call(this);

  if(!arguments[1]) {
    callback = opts;
    opts = {};
  }

  var that = this;

  this.peers = opts.peers || {};
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
    timeout: this.defaultTimeout,
    heartbeatInterval: opts.hbInterval || 3e4,
    sendInterval: opts.bpInterval || 1e4
  };

  this.peers[id] = this.details;

  server.on('message', this.receive.bind(this));

  server.on('listening', function() {
    callback && callback.call(that, that.details);
  });

  this.heartbeat = setInterval(function() {
    ++that.lifetime;
  }, this.details.heartbeatInterval);

  this.broadcast = setInterval(function() {
    that.send('list', that.peers);
  }, this.details.sendInterval);
};

util.inherits(Vine, EventEmitter);

Vine.prototype.listen = function(port) {
  this.server.bind(port || this.details.port);
  return this;
};

Vine.prototype.close = function(port) {

  clearInterval(this.heartbeat);
  clearInterval(this.broadcast);

  clearTimers();

  this.server.close();

  return this;
};

Vine.prototype.join = function(address, port) {
  this.send('list', this.peers, address, port);
  return this;
};

//
// send a message to a random peer.
//
Vine.prototype.send = function(type, data, address, port) {

  ++this.lifetime;

  var that = this;
  var peer;

  //
  // get a random peer, or provide one
  // 
  if (!address && !port) {
    peer = this.randomPeer();

    if (peer === null) {
      return this;
    }
  } 
  else {

    peer = {
      address: address,
      port: port
    }
  }

  var msg = {

    meta: { 
      type: type
    },
    data: data
  };

  var message = new Buffer(JSON.stringify(msg));
  var vine = dgram.createSocket('udp4');

  that.emit('send', peer, msg);

  vine.send(

    message,
    0,
    message.length, 
    peer.port,
    peer.address, 
    function(err, bytes) {
      that.emit('sent', err, peer, msg);
      vine.close();
    }
  );

  return this;
};

Vine.prototype.receive = function(msg, rinfo) {

  var that = this;

  try {
    msg = JSON.parse(String(msg));
  }
  catch(ex) {
    return false;
  }

  that.emit('data', msg, rinfo);

  if (!msg.meta && !msg.meta.type && !msg.data) {
    return false; // not a message we understand.
  }

  // handle merging the lists
  if (msg.meta.type === 'list') {

    that.emit('list', msg.data, rinfo);

    var peers = msg.data; // the message data is a list of peers.

    for (peerId in peers) {

      var knownPeer = that.peers[peerId]; // do we know this peer?

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
          // if we dont hear from this peer for a while,
          // stop trying to broadcast to it until we hear 
          // from it again.
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

  for (var i = 0, attempts = 10; i < attempts; i++) {

    var index = Math.floor(Math.random() * keys.length);
    var key = keys[index];

    var peer = this.peers[key];

    var isAlive = peer.alive;
    var isDifferent = (key !== this.details.uuid);

    if (isDifferent && isAlive) {
      return peer;
    }
  }

  return null;
};
