
//
// - A constructor for instances, mostly for testing reasons
// - An event emitter to advertise when network events happen
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

  
};

util.inherits(Vine, EventEmitter);