
var test = require('tap').test;
var Vine = require('../../vine');

module.exports = {

  "Should receive a list of peers when a peer joins": function(test) {
    
    test.plan(1)

    var vine1
    var vine2

    vine1 = Vine().listen(8001, '127.0.0.1')

    vine1.on('list', function(data) {

      test.ok(data, 'got the list');
      vine1.close();
      vine2.close();
    })

    vine2 = Vine().listen(8002, '127.0.0.1').join(8001)

  },

  "Data should circulate": function(test) {

    test.plan(1)

    var vine1
    var vine2

    vine1 = Vine().listen(8003, '127.0.0.1')

    vine1.set('foo', 'helllo, world')

    vine2 = Vine().listen(8004, '127.0.0.1').join(8003)

    setTimeout(function() {
      console.log(vine2.get('foo'))
    }, 1000);
  }
};
