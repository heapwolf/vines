
//
// - Let's start listening
// - And let's start talking
//
// Here we address
//
//   1. Periodic, binary interactions
//   2. Low frequency of interactions
//
// We dont have anyone to talk to though :(
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
