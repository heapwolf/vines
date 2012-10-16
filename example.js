
var Vine = require('./vine');

var opts1 = {
  port: 8001,
  bpInterval: 100
};

var opts2 = {
  port: 8002,
  bpInterval: 100
};

var vine1 = Vine(opts, function() {

  this.on('message', function(a, b) {
    console.log(a, b);
  });

}).listen();

var vine2 = Vine(opts, function() {

  this.on('message', function(a, b) {
    console.log(a, b);
  });

}).listen();