var net = require('net');
var Stream = require("stream").Stream;
var util = require('util');

var uuid = require('node-uuid'); // we need unique IDs.

var ip = require('./common/ip'); // for discovering the external IP address
var SHash = require('./common/SHash'); // A special collection type
var BallotBox = require('./common/BallotBox'); // for voting

var timers = {};

var Timer = function Timer(timeout, id, callback) {

  if(!(this instanceof Timer)) {
    return timers[id] = new Timer(timeout, id, callback);
  }

  if (typeof id === 'function') {
    callback = id;
    id = uuid.v4();
  }

  this.callback = callback;
  this.timeout = timeout;
  this.id = id;
  this.timer = null;
};

Timer.prototype.start = function() {
  if (this.callback) {
    this.timer = setTimeout(this.callback, this.timeout);
  }
};

Timer.prototype.stop = function() {
  clearTimeout(this.timer);
  delete timers[this.id];
};

Timer.prototype.reset = function() {
  clearTimeout(this.timer);
  this.start();
};

//
// a timer is used to keep track of how long its been 
// since we've heard from a peer. If the timer runs out
// we stop trying to broadcast to that peer by marking
// it as dead. If we hear from it again, it gets marked
// as alive.
//

var Vine = module.exports = function Vine(opts, callback) {

  if(!(this instanceof Vine)) {
    return new Vine(opts, callback);
  }

  Stream.call(this);

  if(!arguments[1]) {
    callback = opts;
    opts = {};
  }

  var that = this;

  this.dataStore = SHash();
  this.ballotbox = BallotBox();

  this.peers = opts.peers || {};
  this.defaultTimeout = opts.timeout || 1e4;

  var server = this.server = net.createServer(function(socket) {

    socket.on('data', function(data) {
      that.write(data, socket);
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
    heartbeatInterval: opts.heartbeatInterval || 100,
    listInterval: opts.listInterval || 500,
    hashInterval: opts.hashInterval || 500
  };

  this.reconnect = {

    max: opts.retries || 10,
    interval: opts.interval || 5000
  };

  //
  // add ourselves to the list of peers that we know about.
  //
  this.peers[id] = this.details;
};

util.inherits(Vine, Stream);

//
// write a message from a peer.
//
Vine.prototype.write = function(msg, socket) {

  var that = this;

  try {
    msg = JSON.parse(String(msg));
  }
  catch(ex) {
    return false;
  }

  that.emit('data', msg, socket);

  //
  // not a message we understand.
  //
  if (!msg.meta && !msg.meta.type && !msg.data) {
    return false;
  }

  //
  // process message data
  //
  var type = msg.meta.type;
  var data = msg.data;

  if (type === 'gossip') {

    var delta = [];

    for (var key in data) {

      if (this.dataStore.interest(key, data[key].hash, data[key].ctime)) {
        delta.push(key);
      }
    }

    if (delta.length > 0) {
      this.send('gossip-request', delta, socket);
    }
    else {
      socket.end();
    }
  }
  else if (type === 'gossip-request') {
    //
    // there has been a request for a value,
    // in this case we can be sure its wanted.
    //
    var delta = {};
    var key = '';

    for (var i=0, l=data.length; i < l; i++) {
      key = data[i];
      delta[key] = this.dataStore.get(key);
    }
    
    this.send('gossip-response', delta, socket);
  }
  else if (type === 'gossip-response') {

    socket.end();

    for (var key in data) {

      this.dataStore.set(key, data[key]);
      that.emit('gossip', key, data[key]);
    }
  }         
  else if (type === 'quorum') {

    socket.end();

    var data = msg.data;
    var topic = data.topic;

    //
    // merge or create the election
    //
    var election = this.ballotbox.merge(this.details.uuid, topic, data);

    if (election.result === null) {

      //
      // we have not yet come to a quorum, we should end this
      // socket and send the votes to another random peer.
      //
      this.send('quorum', this.ballotbox.elections[topic]);
    }
    else {

      var origin = this.peers[election.origin];

      if (origin) {

        this.send('quorum-request', topic, origin.port, origin.address);
      }
    }
  }
  else if (type === 'quorum-request') {

    var topic = msg.data;
    var election = this.ballotbox.elections[topic];

    //
    // if there is a request for the election, that means that
    // a peer thinks it has reached quorum. If the election is
    // not closed, we can close it and return the election data.
    //
    if (election.expired === false && election.closed === false) {

      election.closed = true;

      this.send('quorum-response', election, socket);
    }
  }
  else if (type === 'quorum-response') {

    socket.end();
    this.emit('quorum', msg.data);
  }
  else if (type === 'list') {

    that.emit(type, data, socket);
    socket.end();

    var peers = msg.data;

    for (peerId in peers) {

      var knownPeer = that.peers[peerId];

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
          timers[peerId] && timers[peerId].reset();
        }
      }
      else { // this is a new peer

        // add it to the peers list
        that.peers[peerId] = peers[peerId];

        // creat a timer for this peer
        var timeout = peers[peerId].timeout || this.defaultTimeout;

        var timer = Timer(timeout, peerId, (function(peerId) {
          return function() {
            
            //
            // if we dont hear from this peer for a while,
            // stop trying to broadcast to it until we hear 
            // from it again.
            //
            that.peers[peerId].alive = false;
          }
        }(peerId)));

        timer.start();
      }
    }
  }

  return this;
};

//
// send a message to a random peer.
//
Vine.prototype.send = function(type, data) {

  var that = this;
  var port = arguments[2];
  var address = arguments[3];

  //
  // get a random peer, or provide one
  // 
  if (!arguments[2] && !arguments[3]) {

    var peer = this.randomPeer();

    if (peer === null) {
      return this;
    }

    address = peer.address;
    port = peer.port;
    id = peer.uuid;

  }
  else if (!arguments[3]) {
    address = '127.0.0.1';
  }

  var msg = {

    meta: { 
      type: type
    },
    data: data
  };

  var message = JSON.stringify(msg);

  if (typeof arguments[2] === 'object') {

    var socket = arguments[2];
    socket.write(message);
    return this;
  }

  var attempts = 0;
  var reconnect = null;

  var connect = function() {

    var client = net.connect({
      port: port,
      host: address
    });

    client.on('error', function(err) {

      if (attempts === 0) {
        reconnect = Timers(that.reconnect.interval, id, connect);
      }

      ++attempts;

      if (attempts >= that.reconnect.max) {
        clearInterval(reconnect);
      }
    });

    client.on('data', function(data) {
      that.write(data, client);
    });

    client.on('connect', function() {

      if (reconnect) {
        clearInterval(reconnect);
      }
      client.write(message);
    });
  };

  connect();

  return this;
};

//
// set a local value on this peer.
//
Vine.prototype.gossip = function(key, val) {

  this.dataStore.set(key, val);
};

//
// get a local value from this peer. voting happens
// agressively, each time a vote is cast, it sends to
// a random peer the entire contents of the ballotbox.
//
Vine.prototype.vote = function(topic, value) {

  //
  // each time a vote is cast, we can check to see if
  // we have reached a quorum, if not then send off the
  // votes that we know about to the next random peer.
  //
  var election = this.ballotbox.vote(this.details.uuid, topic, value);

  if (election.closed) {

    if (election.expired) {
      this.emit(
        'expire',
        election
      );
    }
    else if (election.result !== null) {

      //
      // if this election is not closed or expired,
      // and it has a result, we should attempt to
      // request quorum.
      //
      var origin = this.peers[election.result.origin];

      if (origin) {
        this.send(
          'quorum-request',
          topic,
          origin.port,
          origin.address
        );
      }
    }
  }
  else {
    this.send('quorum', election);
  }
  return this;
};

Vine.prototype.election = function(opts) {

  //
  // track the peer creating the election, it
  // will become the election manager peer.
  //
  opts.origin = this.details.uuid;

  this.ballotbox.election(opts);
  return this;
};

//
// listen for messages from other peers.
//
Vine.prototype.listen = function(port, address) {

  var that = this;

  if (port) {
    that.details.port = port;
  }

  that.server.listen(that.details.port, address, function() {

    //
    // we want to send of the list at an interval.
    //
    that.listInterval = setInterval(function() {
      if (Object.keys(that.peers).length > 0) {
        that.send('list', that.peers);
      }
    }, that.details.listInterval);

    //
    // gossip the meta data about the data we have.
    // if a peer is interested they will supply us
    // with a delta of keys and we can return the
    // corresponding values for those keys.
    //
    that.hashInterval = setInterval(function() {
      if (Object.keys(that.dataStore.meta).length > 0) {
        that.send('gossip', that.dataStore.meta);
      }
    }, that.details.hashInterval);

    //
    // we want to measure our lifetime.
    //
    that.heartbeatInterval = setInterval(function() {
      ++that.details.lifetime;
    }, that.details.heartbeatInterval);
  });

  return this;
};

Vine.prototype.end = function() {

  clearInterval(this.heartbeatInterval);
  clearInterval(this.listInterval);
  clearInterval(this.hashInterval);

  for(var timer in timers) {
    clearTimeout(timers[timer].timer);
    delete timers[timer];
  }

  this.server.close();

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
// get a random peer from the list of known peers.
//
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
