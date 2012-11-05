
var test = require('tap').test
var Vine = require('../../index')

module.exports = {

  "Instances should connect": function(test) {
    
    test.plan(1)

    var v1 = Vine().listen(7001)
    var v2 = Vine().listen(7002).join(7001)

    setTimeout(function() {
      v1.end()
      v2.end()
      test.ok(true, 'done')
    }, 500)

  },

  "Instances should try to reconnect if a connection attempt fails": function(test) {
    
    test.plan(1)

    var v1, v2;

    setTimeout(function() {
      v1 = Vine().listen(7003)
    }, 500);

    //
    // attempt to connect before it exists
    //
    v2 = Vine().listen(7004).join(7003) 

    //
    // expect that a list is recieved
    //
    v2.on('list', function(data) {
      
      v1.end()
      v2.end()
      test.ok(true, 'received a list from a peer')
    })

  }
}