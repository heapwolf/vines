
[Node Vines](https://raw.github.com/hij1nx/vines/master/node-vines.png)

# Vines

A distributed system has many discrete processes that run on a multitude of
arbitrary devices and networks yet to the user it appears to be a single
coherent program. Distributed systems can help to provide availability and 
fault tolerance.

Since fault-tolerance and absolute consistency are not exactly compatable, 
`vines` attempts to make data replication and coordinated decision making 
through a combination of [eventual consistency][0] and 
[quorum-based concensus][1].


A computer at `192.168.0.2`

```js
  var vine = Vine()

  vine
    .listen(8000)
    .set('foo', 'hello, world')
```

A computer at `192.168.0.3`

```js
  var vine = Vine()

  vine
    .listen(8000)
    .join(8000, '192.168.0.2')
    .on('data', 'foo')
```

[0]:http://www.oracle.com/technetwork/products/nosqldb/documentation/consistency-explained-1659908.pdf
[1]:http://pbs.cs.berkeley.edu/pbs-vldb2012.pdf
[2]:http://www.cs.utexas.edu/~lorenzo/papers/p14-alvisi.pdf
[3]:http://citeseerx.ist.psu.edu/viewdoc/download;jsessionid=5A7801DAF5FBEDD7D15599DEA8AA2677?doi=10.1.1.34.9524&rep=rep1&type=pdf
[4]:http://net.pku.edu.cn/~course/cs501/2011/resource/2006-Book-distributed%20systems%20principles%20and%20paradigms%202nd%20edition.pdf
