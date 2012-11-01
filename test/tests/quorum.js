
var test = require('tap').test
var Vine = require('../../vine')

module.exports = {

  "A peer should commit to an action after a quorum is reached": function(test) {

    test.plan(1)

    var vine1
    var vine2
    var vine3

    var now = new Date(Date.now())

    var electionCriteria = {
      topic: 'a',
      expire: String(new Date(now.setMinutes(now.getMinutes() + 1))),
      min: 2, // in the real world, this would be a percentage of the total
      total: 3 // in the real world, this would be discovered dynamically
    }

    var onQuorum = function(election) {

      if (election.topic === 'a') {

        vine1.close()
        vine2.close()
        vine3.close()

        test.equal(election.topic, 'a', 'quorum has been reached')
      }
    }

    vine1 = Vine()
      .listen(8005)
      .election(electionCriteria)
      .on('quorum', onQuorum)
    ;

    vine2 = Vine()
      .listen(8006)
      .join(8005)
      .election(electionCriteria)
      .on('quorum', onQuorum)
    ;

    vine3 = Vine()
      .listen(8007)
      .join(8005)
      .election(electionCriteria)
      .on('quorum', onQuorum)
    ;

    setTimeout(function() { vine1.vote('a', true) }, 100)
    setTimeout(function() { vine2.vote('a', true) }, 200)
    setTimeout(function() { vine3.vote('a', true) }, 300)
  },

  "An expired election should never reach quorum": function(test) {

    test.plan(1)

    var vines = {}
    var expired = false

    var now = new Date(Date.now())

    var electionCriteria = {
      topic: 'b',
      expire: 60,
      min: 4,
      total: 5
    }

    var onQuorum = function(election) {

      if (election.topic === 'b') {

        test.fail(election.topic, 'b', 'Should not reach quorum')

      }
    }

    var onExpire = function(election) {

      if (election.topic === 'b' && expired === false) {
        
        expired = true;
        test.ok(true, 'Should emit the expire event')

        //
        // close all of the open servers
        //
        Object.keys(vines).forEach(function(key) {
          vines[key].close()
        })
      }
    }

    vines.vine1 = Vine()
      .listen(8008)
      .election(electionCriteria)
      .on('expire', onExpire)
      .on('quorum', onQuorum)
    ;

    vines.vine2 = Vine()
      .listen(8009)
      .join(8008)
      .on('expire', onExpire)
      .on('quorum', onQuorum)
    ;

    vines.vine3 = Vine()
      .listen(8010)
      .join(8008)
      .on('expire', onExpire)
      .on('quorum', onQuorum)
    ;

    vines.vine4 = Vine()
      .listen(8011)
      .join(8009)
      .on('expire', onExpire)
      .on('quorum', onQuorum)
    ;

    vines.vine5 = Vine()
      .listen(8012)
      .join(8009)
      .on('expire', onExpire)
      .on('quorum', onQuorum)
    ;

    Object.keys(vines).forEach(function(key) {

      setTimeout(
        function() { vines[key].vote('b', true) },
        Math.floor(Math.random() * 100)
      )
    })

  }
}