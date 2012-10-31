
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

SHash.prototype.randomPair = function() {

  var keys = Object.keys(this.data);

  var index = Math.floor(Math.random() * keys.length);
  var key = keys[index];

  return keys.length > 0 && [key, this.data[key].hash];
};

//
// if the key does not exist at all, we want it,
// also if the key exists and the hash is different.
//
SHash.prototype.interest = function(key, sha1) {

  return (typeof this.data[key] === 'undefined' ||
  (this.data[key] && this.data[key].hash !== sha1))
};

SHash.prototype.delete = function(key) {
  if (this.data[key]) {
    this.data[key] = {};
    return true;
  }
  
  return false;
};

SHash.prototype.get = function(key) {

  return this.data[key].value;
};

SHash.prototype.getHash = function() {
  return this.data[key].hash;
};

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
