![Node Vines](https://raw.github.com/hij1nx/vines/master/node-vines.png)

## Motivation

Distributed software provides availability and fault-tolerance. To achieve this, a 
distributed program has more than one discrete process that will run on any number of 
devices or networks. If some of the processes in the program are partitioned or lost,
the program can continue to run. All of this happens behind the scenes and the user
will observe a single coherent program.

Each process in a distributed program will likely produce data and or want to act 
on behalf of the entire program. Each process needs to make informed decisions that 
are based on local data as well as data created by other processes in the program. 
It's not always efficient or possible to have all the processes in a network 
synchronize before a decision needs to be made.

## Synopsis
Vines attempts to facilitate coordinated decision making through a combination of 
[eventual consistency][0] and [quorum-based consensus][1]. Vines may be useful for
applications such as _monitoring_ and _automated provisioning_.

Vines aims to be a high level solution. It implements connection machinery. If you
are looking for a simple streamable gossip implementation, consider [scuttlebutt][3].

## Features

 - Quorum based consensus; a simple voting protocol that is partition tolerant.
 - Gossip based data replication; reduces network footprint in large networks.
 - Attempts automatic reconnect for peer processes before selecting a new random peer.

## Examples

### Data replication

A computer at `192.168.0.2` can generate some information.

```js
  var vine = Vine()

  vine
    .listen(8000)
    .gossip('foo', 'hello, world')
```

A computer at `192.168.0.3` can discover that information regardless of
when then peers were connected or when the data was entered.

```js
  var vine = Vine()

  vine
    .listen(8000)
    .join(8000, '192.168.0.2')
    .on('gossip', 'foo', function(value) {
      console.log(value);
    })
```

### Concensus

A computer at `192.168.0.2` can call an election and cast a vote.

```js

  var electionCriteria = {
    topic: 'email',
    expire: String(new Date(now.setMinutes(now.getMinutes() + 5))),
    min: 2,
    total: 2
  }

  var vine = Vine()

  vine
    .listen(8000)
    .on('quorum', onQuorum)
    .on('expire', onExpire)
    .election(electionCriteria)
    .vote('email', true)
```

A computer at `192.168.0.3` can also call an election however only one
of the peers will be able to execute the callback for the `quorum` event.

```js
  var vine = Vine()

  vine
    .listen(8000)
    .join(8000, '192.168.0.2')
    .on('quorum', onQuorum)
    .on('expire', onExpire)
    .election(electionCriteria)
    .vote('email', true)
```

[0]:http://www.oracle.com/technetwork/products/nosqldb/documentation/consistency-explained-1659908.pdf
[1]:http://pbs.cs.berkeley.edu/pbs-vldb2012.pdf
[2]:http://www.cs.utexas.edu/~lorenzo/papers/p14-alvisi.pdf
[3]:https://github.com/dominictarr/scuttlebutt
[4]:http://citeseerx.ist.psu.edu/viewdoc/download;jsessionid=5A7801DAF5FBEDD7D15599DEA8AA2677?doi=10.1.1.34.9524&rep=rep1&type=pdf
[5]:http://net.pku.edu.cn/~course/cs501/2011/resource/2006-Book-distributed%20systems%20principles%20and%20paradigms%202nd%20edition.pdf
