
var net = require('net');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var uuid = require('node-uuid'); // we need unique IDs.

var ip = require('./common/ip'); // for discovering the external IP address
var diff = require('./common/diff'); // not used yet.
var SHash = require('./common/SHash'); // A special collection type
var BallotBox = require('./common/BallotBox'); // for voting

var timers = {};

var dataStore = SHash();
var ballotbox = BallotBox();

var clearTimers = function() {

  for(var timer in timers) {
    clearTimeout(timers[timer].timer);
    delete timers[timer];
  }
};

//
// a timer is used to keep track of how long its been 
// since we've heard from a peer. If the timer runs out
// we stop trying to broadcast to that peer by marking
// it as dead. If we hear from it again, it gets marked
// as alive.
//
var Timer = function Timer(timeout, uuid, callback) {

  if(!(this instanceof Timer)) {
    return timers[uuid] = new Timer(timeout, uuid, callback);
  }

  this.callback = callback;
  this.timeout = timeout;
  this.uuid = uuid;
  this.timer = null;
};

Timer.prototype.start = function() {
  
  this.timer = setTimeout(this.callback, this.timeout);
};

Timer.prototype.stop = function() {
  clearTimeout(this.timer);
  delete timers[this.uuid];
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
    listInterval: opts.listInterval || 300,
    hashInterval: opts.hashInterval || 300
  };

  //
  // add ourselves to the list of peers that we know about.
  //
  this.peers[id] = this.details;
};

util.inherits(Vine, EventEmitter);

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

  that.emit(type, data, socket);

  if (type === 'gossip') {

    var delta = [];

    for (var key in data) {

      if (dataStore.interest(key, data[key].hash, data[key].ctime)) {
        delta.push(key);
      }
    }

    if (delta > 0) {

      socket.write({
        meta: {
          type: 'gossip-request'
        },
        data: delta
      });

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

    for (var i = 0, l = data.length; i > l; i++) {
      delta[data[i]] = dataStore[data[i]].value;
    }

    socket.write({
      meta: {
        type: 'gossip-response'
      },
      data: delta
    });
  }
  else if (type === 'gossip-response') {

    socket.end();

    for (var key in data) {
      dataStore.set(key, data[key]);
    }
  }
  else if (type === 'quorum') {

    var data = msg.data;
    var topic = data.topic;

    //
    // merge or create the election
    //
    var election = ballotbox.merge(this.details.uuid, topic, data);

    if (election.result === null) {

      //
      // we have not yet come to a quorum, we should end this
      // socket and send the votes to another random peer.
      //
      this.send('quorum', ballotbox.elections[topic]);
    }
    else {

      var origin = this.peers[election.origin];

      if (origin) {
        this.send('quorum-request', topic, origin.port, origin.address);
      }
    }

    socket.end();
  }
  else if (type === 'quorum-request') {

    var topic = msg.data;
    var election = ballotbox.elections[topic];

    //
    // if there is a request for the election, that means that
    // a peer thinks it has reached quorum. If the election is
    // not closed, we can close it and return the election data.
    //
    if (election.expired === false && election.closed === false) {

      election.closed = true;

      socket.write({
        meta: {
          type: 'quorum-response',
        },
        data: election
      });
    }
  }
  else if (type === 'quorum-response') {

    socket.end();

    this.emit(
      'quorum',
      msg.data
    );
  }
  else if (type === 'list') {

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

    socket.end(); // we got the list, no need to have a conversation.
  }

  return this;
};

//
// send a message to a random peer.
//
Vine.prototype.send = function(type, data, port, address) {

  ++this.details.lifetime;

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

  that.emit('send', port, address, msg);

  var message = new Buffer(JSON.stringify(msg));

  var client = net.connect({
    port: port, 
    host: address 
  });

  client.on('error', function(err) {
    // do nothing
  })

  client.on('connect', function() {

    that.emit('sent', port, address, msg);
    client.write(message);
  });

  return this;
};

//
// set a local value on this peer.
//
Vine.prototype.set = function(key, val) {

  dataStore.set(key, val);
};

//
// get a local value from this peer.
//
Vine.prototype.get = function(key) {

  return dataStore.get(key);
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
  var election = ballotbox.vote(this.details.uuid, topic, value);

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
      var origin = this.peers[result.origin];

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

  ballotbox.election(opts);
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
      that.send('list', that.peers);
    }, that.details.listInterval);

    //
    // gossip the meta data about the data we have.
    // if a peer is interested they will supply us
    // with a delta of keys and we can return the
    // corresponding values for those keys.
    //
    that.hashInterval = setInterval(function() {
      that.send('gossip', dataStore.meta);
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

Vine.prototype.close = function() {

  clearInterval(this.heartbeatInterval);
  clearInterval(this.listInterval);
  clearInterval(this.hashInterval);

  clearTimers();

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
