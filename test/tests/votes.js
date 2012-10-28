
var test = require('tap').test
var Vine = require('../../vine')

module.exports = {

  "A peer should commit to an action after a quorum is reached": function(test) {

    test.plan(1)

    var vine1
    var vine2

    var now = new Date(Date.now())

    var election1 = {
      topic: 'foo',
      deadline: now.setMinutes(now.getMinutes() + 1),
      min: 2, // in the real world, this would be a percentage of the total
      total: 3 // in the real world, this would be discovered dynamically
    }

    var onQuorum = function(key, votes, results) {

      if (key === 'foo') {

        test.equal(key, 'foo', 'quorum has been reached')
        
        console.log(votes, results)

      }

      vine1.close()
      vine2.close()
      vine3.close()
    }

    vine1 = Vine()
      .listen(8005)
      .election(election1)
      .on('quorum', onQuorum)
    ;

    vine2 = Vine()
      .listen(8006)
      .join(8005)
      .on('quorum', onQuorum)
    ;

    vine3 = Vine()
      .listen(8007)
      .join(8005)
      .on('quorum', onQuorum)
    ;

    setTimeout(function() { vine1.vote('foo', true) }, 2000)
    setTimeout(function() { vine2.vote('foo', true) }, 3000)
    setTimeout(function() { vine3.vote('foo', true) }, 4000)

  }
};
