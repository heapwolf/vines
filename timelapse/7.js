
//
// - Joining means sending a peer some data,
// - We need a simple way to send messages.
//
//

var net = require('net');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var uuid = require('node-uuid'); // we need unique IDs.

var ip = require('./common/ip'); // for discovering the external IP address
var diff = require('./common/diff'); // not used yet.
var SHash = require('./common/SHash'); // A special collection type

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

  var server = this.server = net.createServer(function(socket) {
    
    //
    // when we get data, decide if 
    // we are interested in it or not.
    //
    socket.on('data', function(data) {
      
      //
      // we pass in the socket so that 
      // we can have a conversation if
      // the need arises.
      //
      that.receive(data, socket);
    });
  });

  server.on('connection', callback || function() {});

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
    heartbeatInterval: opts.heartbeatInterval || 3e4,
    listInterval: opts.listInterval || 6e4,
    hashInterval: opts.listInterval || 1e4
  };

  //
  // add ourselves to the list of peers that we know about.
  //
  this.peers[id] = this.details;
};

util.inherits(Vine, EventEmitter);

//
// send a message to a random peer.
//
Vine.prototype.send = function(type, data, port, address) {

  ++this.lifetime;

  var that = this;

  //
  // get a random peer, or provide one
  // 
  if (!address && !port) {

    var peer = this.randomPeer();

    if (peer === null) {
      return this;
    }

    address = peer.address;
    port = peer.port;

  }
  else if (!address) {
    address = '127.0.0.1';
  }

  var msg = {

    meta: { 
      type: type
    },
    data: data
  };

  that.emit('send', peer, msg);
  
  var message = new Buffer(JSON.stringify(msg));

  var client = net.connect({
    port: port, 
    host: address 
  });

  client.on('connect', function() {
    that.emit('sent', peer, msg);
    client.write(message);
  });

  return this;
};

//
// join an existing peer by sending the list of known peers.
//
Vine.prototype.join = function(port, address) {
  this.send('list', this.peers, port, address);
  return this;
};

//
// 1. Periodic, binary interactions
//
Vine.prototype.listen = function(port, address) {

  var that = this;

  that.server.listen(port || that.details.port, address, function() {

    //
    // we want to send of the list at an interval.
    //
    that.listInterval = setInterval(function() {
      that.send('list', that.peers);
    }, that.details.listInterval);

    //
    // we want to send off a random pair at an interval.
    //
    that.hashInterval = setInterval(function() {

      //
      // 2. Low frequency of interactions
      //
      that.send('gossip', dataStore.randomPair());
    }, that.details.hashInterval);

    //
    // we want to measure our lifetime.
    //
    that.heartbeatInterval = setInterval(function() {
      ++that.lifetime;
    }, that.details.heartbeatInterval);
  });

  return this;
};
