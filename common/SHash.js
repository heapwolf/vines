
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

//
// if the hash exists, but is not equal, return 
// the corresponding value from the data store.
//
SHash.prototype.getUnique = function(key, sha1) {

  var hashA = sha1;
  var hashB = this.data[key].hash;

  if (hashB && hashA !== hashB) {
    return this.data[key].value;
  }
  else {
    return false;
  }
};

SHash.prototype.delete = function(key) {
  if (this.data[key]) {
    this.data[key] = {};
    return true;
  }
  
  return false;
};

//
// if the hash is not the same set the value.
//
SHash.prototype.setUnique = function(key, value, sha1) {

  var shasumA = crypto.createHash('sha1');
  shasumA.update(value);
  var hashA = shasumA.digest('hex');

  //
  // get the hash for the requested key
  //
  var hashB = this.data[key].hash;

  if (hashA !== hashB) {

    this.data[key].value = value;
    this.data[key].hash = hashA;
    return true;
  }
  else {

    return false;
  }
};

SHash.prototype.get = function(key) {

  return this.data[key].value;
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
