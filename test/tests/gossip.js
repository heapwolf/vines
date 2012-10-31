var test = require('tap').test
var Vine = require('../../vine')

module.exports = {

  "A list of known peers should circulate between peers": function(test) {
    
    test.plan(1)

    var vine1
    var vine2

    vine1 = Vine().listen(8001)

    vine1.on('list', function(data) {

      test.ok(data, 'got the list')
      vine1.close()
      vine2.close()
    })

    vine2 = Vine().listen(8002).join(8001)

  },

  "Data should circulate between peers": function(test) {

    test.plan(1)

    var vine1
    var vine2

    vine1 = Vine().listen(8003)

    vine1.set('foo', 'hello, world')

    vine2 = Vine().listen(8004).join(8003)

    setTimeout(function() {

      //need to get this from an emit
      test.equal('hello, world', vine2.get('foo'))
      vine1.close()
      vine2.close()

    }, 4000);
  }
};
