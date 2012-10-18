
//
// - StrictHash is a collection type
// - A primitive data store
// - Wants only unique data
// 
// If you are telling me some gossip, 
// I dont what to hear the whole story
// before I can tell you i know about it already.
//

var crypto = require('crypto');

var SHash = module.exports = function SHash(data, hashes) {

  if(!(this instanceof SHash)) {
    return new SHash(data, hashes);
  }

  this.data = data || {};
};

SHash.prototype.dump = function() {
  return this.data;
};

//
// get a random key and hash pair
//
SHash.prototype.randomPair = function() {
  
  var keys = Object.keys(this.data);
  var index = Math.floor(Math.random() * keys.length);
  var key = keys[index];

  return [key, this.data[key].hash];
};

//
// if the key does not exist at all, we want it,
// also if the key exists and the hash is different.
//
SHash.prototype.interest = function(key, sha1) {

  return (typeof this.data[key] === 'undefined' ||
  (this.data[key] && this.data[key].hash !== sha1))
};

SHash.prototype.get = function(key) {

  return this.data[key].value;
};

//
// create a sha1 hash on the value and
// add the value and hash to the collection.
//
SHash.prototype.set = function(key, value) {

  var shasum = crypto.createHash('sha1');
  shasum.update(value);
  var hash = shasum.digest('hex');

  if(!this.data[key]) {
    this.data[key] = {};
  }

  this.data[key].value = value;
  return this.data[key].hash = hash;
};
