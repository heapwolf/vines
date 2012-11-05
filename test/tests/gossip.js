var test = require('tap').test
var Vine = require('../../index')

module.exports = {

  "A list of known peers should circulate between peers": function(test) {
    
    test.plan(1)

    var vine1
    var vine2

    vine1 = Vine().listen(8001)

    vine1.on('list', function(data) {

      test.ok(data, 'got the list')
      vine1.end()
      vine2.end()
    })

    vine2 = Vine().listen(8002).join(8001)

  },

  "Data should circulate between peers": function(test) {

    test.plan(1)

    var vine1
    var vine2

    vine1 = Vine().listen(8003)
    vine2 = Vine().listen(8004).join(8003)

    vine2.on('gossip', function(key, data) {

      //need to get this from an emit
      if (key === 'foo') {

        test.ok(data, 'got the gossip with the correct key')

        vine1.end()
        vine2.end()
      }

    })

    setTimeout(function() {

      vine1.gossip('foo', 'hello, world') 
    }, 1000)
      
  }
};
