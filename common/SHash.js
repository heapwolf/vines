
var crypto = require('crypto');

var SHash = module.exports = function SHash() {

  if(!(this instanceof SHash)) {
    return new SHash();
  }

  this.data = {};
  this.meta = {};
};

SHash.prototype.randomPair = function() {

  var keys = Object.keys(this.meta);

  var index = Math.floor(Math.random() * keys.length);
  var key = keys[index];

  return keys.length > 0 && [key, this.meta[key].hash];
};

//
// if the key does not exist at all, we want it,
// also if the key exists and the hash is different.
//
SHash.prototype.interest = function(key, hash, ctime) {

  var meta = this.meta[key];

  if (typeof meta === 'undefined') {
    return true;
  }

  var thisCTime = new Date(meta.ctime);
  var thatCTime = new Date(ctime);

  return (meta.hash !== hash) && (thisCTime > thatCTime);
};

SHash.prototype.delete = function(key) {

  if (this.meta[key] && this.data[key]) {
    delete this.data[key];
    delete this.meta[key];
    return true;
  }

  return false;
};

SHash.prototype.get = function(key) {

  return this.data[key];
};

SHash.prototype.set = function(key, value) {

  var shasum = crypto.createHash('sha1');
  shasum.update(value);

  var hash = shasum.digest('hex');

  if(!this.meta[key]) {
    this.meta[key] = {};
  }

  this.data[key] = value;
  this.meta[key].ctime = String(new Date(Date.now()));
  this.meta[key].hash = hash;

  return hash;
};
