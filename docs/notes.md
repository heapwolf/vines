
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