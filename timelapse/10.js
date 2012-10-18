
//
// - We need to have a conversation with the peer.
// - I send a random peer some gossip (not really, a sha1 hash).
// - It tells me if it's interested (hey i dont know about that).
// - If it's interested, send it the actual value from the key
//
// The addresses
//   4. Agents adapt state on interaction
//   5. Size-Bound data exchanges
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
// listen for messages from other peers.
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
      that.send('gossip', dataStore.randomPair());
    }, that.details.hashInterval);

    //
    // we want to live.
    //
    that.heartbeatInterval = setInterval(function() {
      ++that.lifetime;
    }, that.details.heartbeatInterval);
  });

  return this;
};

//
// receive a message from a peer.
//
Vine.prototype.receive = function(msg, socket) {

  var that = this;

  try {
    msg = JSON.parse(String(msg));
  }
  catch(ex) {
    return false;
  }

  that.emit('data', msg, socket);

  if (!msg.meta && !msg.meta.type && !msg.data) {
    return false; // not a message we understand.
  }

  that.emit(msg.meta.type, msg.data, socket);

  if (msg.meta.type === 'gossip') { // handle incoming key/hash pair.

    var key = msg.data[0];
    var hash = msg.data[1];
    
    if (dataStore.interest(key, hash)) {  // its new, we want it.

      socket.write({ // send a message back to the socket.
        meta: {
          type: 'request'
        },
        data: msg.data
      });
    }
    else { // we already know about this.

      //
      // we can end the conversation now. Although, to
      // comply with the gossip protocol, we should actually
      // cycle until we find something that is an update.
      //
      socket.end();
    }

  }
  else if (msg.meta.type === 'request') {

    //
    // there has been a request for a value,
    // in this case we can be sure its wanted.
    //
    var key = msg.data[0];
    var hash = msg.data[1];

    socket.write({ // send a message to the socket with the value in it.
      meta: {
        type: 'response'
      },
      data: {
        key: key,
        value: dataStore.get(key)
      }
    });
  }
  else if (msg.meta.type === 'response') {

    dataStore.setUnique(msg.data.key, msg.data.value);
    socket.end();
  }
  else if (msg.meta.type === 'list') { // handle merging the lists

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
          timers[peerId].reset();
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

    socket.end(); // we got the list, no need to have a conversation.
  }

  return this;
};