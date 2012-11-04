
var test = require('tap').test
var Vine = require('../../vine')

module.exports = {

  "Create an instance of a peer": function(test) {
    
    test.plan(1)

    var v1 = Vine().listen(8000)

    setTimeout(function() {
      v1.end()
      test.ok(true, 'done')
    }, 500)

  },

  "Create two instances of a peer": function(test) {
    
    test.plan(1)

    var v1 = Vine().listen(7001)
    var v2 = Vine().listen(7002)

    setTimeout(function() {
      v1.end()
      v2.end()
      test.ok(true, 'done')
    }, 500)

  },

  "Connect two peers that will initiate an election": function(test) {
    
    test.plan(1)

    var v1 = Vine().listen(7003)
    var v2 = Vine().listen(7004).join(7003)

    var now = new Date(Date.now())

    var onQuorum = function(election) {

      if (election.topic === 'a') {

        v1.end()
        v2.end()

        test.equal(
          election.topic, 
          'a', 
          'quorum has been reached, executed by only one peer'
        )
      }
    }

    var electionCriteria = {
      topic: 'a',
      expire: String(new Date(now.setMinutes(now.getMinutes() + 5))),
      min: 2,
      total: 2
    }

    v1.on('quorum', onQuorum).election(electionCriteria)
    v2.on('quorum', onQuorum).election(electionCriteria)

    setTimeout(function() {
      v1.vote('a', true);
    }, 300)

    setTimeout(function() {
      v2.vote('a', true);
    }, 800)    

  },

  "An election should expire": function(test) {
    
    test.plan(1)

    var v1 = Vine().listen(7003)
    var v2 = Vine().listen(7004).join(7003)

    var now = new Date(Date.now())
    var counter = 0;

    var onQuorum = function(election) {

    }

    var onExpire = function(election) {

      ++counter;

      if (election.topic === 'a' && counter === 2) {

        v1.end()
        v2.end()

        test.ok(true, 'Should emit the expire event')
      }
    }

    var electionCriteria = {
      topic: 'a',
      expire: String(new Date(now.setMinutes(now.getMinutes() + .1))),
      min: 2,
      total: 2
    }

    v1
      .on('quorum', onQuorum)
      .on('expire', onExpire)
      .election(electionCriteria)

    v2
      .on('quorum', onQuorum)
      .on('expire', onExpire)
      .election(electionCriteria)

    setTimeout(function() {
      v1.vote('a', true);
    }, 300)

    setTimeout(function() {
      v2.vote('a', true);
    }, 800)    

  }
}