
//
// # Background
//
// - Smaller programs are easier to manage and lifecycle
// - How to we connect them and sync data between them?

// # Primary tenants of the Gossip Protocol
//
// 1. Periodic, binary interactions
// 2. Low frequency of interactions
// 3. Randomization of interactions
// 4. Agents adapt state on interaction
// 5. Size-Bound data exchanges
// 6. Reliability is assumed to be unreliable 
//    - not relevant because we're looking for eventual, not immediate consistency

var net = require('net');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var uuid = require('node-uuid'); // we need unique IDs.

var ip = require('./common/ip'); // for discovering the external IP address
var diff = require('./common/diff'); // not used yet.
var SHash = require('./common/SHash'); // A special collection type

