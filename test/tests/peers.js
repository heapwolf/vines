

var test = require('tap').test;
var Vine = require('../../vine');

module.exports = {

  "Should receive a list of peers when a peer joins": function(test) {

    test.plan(2);

    var vine1
    var vine2

    vine1 = Vine(function(vine) {

      console.log('vine 1 started')

      this.on('list', function(data, b) {

        test.equal(typeof data, 'object', 'got the list')
        vine1.close()
      });

    }).listen(8001)

    setTimeout(function() {

      vine2 = Vine(function(vine) {
        
        var that = this
        console.log('vine 2 started')

        this.on('sent', function(err, peer, data) {

          if (data.meta.type === 'list') {
            console.log('vine 2 sent peer list to vine 1')
          }

          if (err) {
            test.fail(err);
            
          }
          else {
            test.ok(true, 'the list was sent')
            that.close()
          }
        })
      })
        .listen(8002)
        .join('127.0.0.1', 8001)

    }, 2000)

  }
};

