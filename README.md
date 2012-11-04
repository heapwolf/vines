
A distributed system has many discrete processes that run on a multitude of
arbitrary devices and networks yet to the user it appears to be a single,
coherent program. Distributed systems can provide availability and fault
tolerance.

Distribution requires data replication but fault-tolerance and exact 
consistency are simply not incompatable.

Eventual consistency allows peers who wish to replicate an opportunity to 
update regardless of the state of synchronization.

This implementation is limited to the distribution of peer information and 
data structures in order to support heterogeneous infrastructure.


# What is the Gossip Protocol

The gossip protocol helps to manage inconsistencies due to partition loss and 
process failure in a distributed system.

## Charactarizations

- Periodic, binary interactions
- Low frequency of interactions
- Randomization of interactions
- Agents adapt state on interaction
- Size-Bound data exchanges
- Reliability is UDP-ish

## Assumptions

- Each peer has membership. In this protocol, the knowledge of membership is 
distributed to each member at a regular interval. 

## Considerations

### Convergence Rate
Convergence rate is the randomization algorithm combind with the frequency 
at which it is applied. Gossip protocols can be adapted to tolerate process
crashes by adjusting the convergence rate.

# What is the Quorum Consensus Protocol
TODO

## Charactarizations
TODO

## Assumptions
TODO

## Considerations
TODO

# Research Papers
TODO

[How robust are gossip-based communication protocols?][0]

[An Efficient Implementation of the Quorum Consensus Protocol][1]

[Distributed systems principles and paradigms 2nd edition][2]


# Architectural Design
TODO

# Usage
TODO

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

[0]:http://www.cs.utexas.edu/~lorenzo/papers/p14-alvisi.pdf
[1]:http://citeseerx.ist.psu.edu/viewdoc/download;jsessionid=5A7801DAF5FBEDD7D15599DEA8AA2677?doi=10.1.1.34.9524&rep=rep1&type=pdf
[2]:http://net.pku.edu.cn/~course/cs501/2011/resource/2006-Book-distributed%20systems%20principles%20and%20paradigms%202nd%20edition.pdf
