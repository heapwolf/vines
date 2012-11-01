//
// ballotbox is a collection type that implements a
// quorum-based voting commit protocol.
//
var BallotBox = module.exports = function BallotBox(elections) {

  if(!(this instanceof BallotBox)) {
    return new BallotBox(elections);
  }

  this.elections = elections || {};
};

//
// if the election does not exist, it gets created.
// you cant vote twice, but you can change your vote.
// also check to see if the vote being cast satisfies
// the criteria for election. returns the state of the
// election for the topic provided.
// 
// @uuid {String} a UUID that represents the voter id
// @topic {String} a topic to identify the election
// @data {Boolean} true for `commit` or false for `abort`
//
BallotBox.prototype.vote = function(uuid, topic, data) {

  //
  // if there is no election we can stub one
  // out so that votes can be collected for it.
  //
  if (!this.elections[topic]) {

    this.election({
      topic: topic,
      origin: uuid
    });
  }

  var election = this.elections[topic];

  //
  // you can't vote on elections that already 
  // has results.
  //
  if (election.closed) {
    return election;
  }

  if (election.expire) {

    var now = new Date(Date.now());
    var expire = new Date(election.expire);

    if (now > expire) {

      //
      // if the current date/time is greater than the 
      // expire, this is an automatic win for aborting.
      //
      election.result = null;
      election.closed = true;
      election.expired = true;
      election.owner = uuid;
    }
  }

  election.votes[uuid] = data;

  return this.decide(uuid, topic);
};

// 
// @uuid {String} a UUID that represents the voter id
// @topic {String} a topic to identify the election
// @data {Object} an election object
//
BallotBox.prototype.merge = function(uuid, topic, data) {

  var election = this.elections[topic];

  if (!election) {
    election = this.elections[topic] = data;
  }

  //
  // you cant merge votes for elections that is closed
  //
  if (election.closed) {
    return election;
  }

  //
  // if the new ctime is earlier, we should merge
  // election info with the info in this data.
  //
  var thisCTime = new Date(election.ctime);
  var thatCTime = new Date(data.ctime);
  
  if (thatCTime < thisCTime) {
    for (var key in data) {
      if (key !== 'votes') {
        election[key] = data[key];
      }
    }
  }

  //
  // merge in the votes from an election 
  // not yet held on this peer.
  //
  if (this.elections[topic]) {

    var votes = data.votes;

    for(var uuid in votes) {
      this.elections[topic].votes[uuid] = votes[uuid];
    }
  }
  else {
    
    this.elections[topic] = data;
  }

  return this.decide(uuid, topic);
};

//
// given a topic, we can verify the number of votes against 
// the criteria for election and see if a decision can be 
// made.
//
// let every peer participating in an election be assigned 
// a vote `Vi`. The total number of votes in the system must 
// be `V` and the abort and commit quorums are `Va` and `Vc`, 
// and `m` is the minimum required votes. We can return an 
// object only if
//
//   Va + Vc > V && (Va < m || Vc < m)
//
// 
// @uuid {String} a UUID that represents the voter id
// @topic {String} a topic to identify the election
//
BallotBox.prototype.decide = function(uuid, topic) {

  var election = this.elections[topic];

  //
  // if a decision has already been made, return false.
  //
  if (election.closed || election.expired) {
    return election;
  }

  var total = election.total;
  var min = election.min;

  //
  // we have a voter but no election details, a decision
  // can not be made with the information that we have.
  //
  if (total === null || min === null) {
    return this.elections[topic];
  }

  var votes = election.votes;

  var Vc = 0;
  var Va = 0;

  //
  // iterate through all the votes and determine which
  // votes were for a commit and which were for an abort.
  //
  for (var vote in votes) {
    votes[vote] ? ++Vc : ++Va;
  }

  var V = Vc + Va;

  //
  // ensure that a transaction cannot be committed and 
  // aborted at the same time.
  //

  if (V >= total) {

    if (Vc === Va) {
      return election;
    }

    var minimum = Vc >= min || Va >= min;

    //
    // if there are the minimum number of votes,
    // we can return an object that contains who is
    // responsible for making the decision and what 
    // the result of the decision was.
    //
    if (minimum) {

      election.result = Vc > Va;
      election.owner = uuid;

      return election;
    }
  }

  return election;
};

//
// Create an election and define its criteria.
//
// @@total {Number} the total number of systems known
// @@min {Number} minimum votes needed to satisfy an election
// @@expire {String} represents a serialized future date
//
BallotBox.prototype.election = function(opts) {

  if (!opts || !opts.topic) {
    return this;
  }

  if (!this.elections[opts.topic]) {
    this.elections[opts.topic] = {};
  }

  //
  // establishing min addresses network partitioning. peers
  // may be partitioned and the partitions may not be able to 
  // communicate with each other. min should be the minumum
  //
  this.elections[opts.topic] = {

    topic: opts.topic,

    min: opts.min || null,
    total: opts.total || null,

    ctime: String(new Date(Date.now())),
    expire: opts.expire || null,
    expired: false,

    votes: {},

    origin: opts.origin,
    owner: null,

    result: null,
    closed: false
  };

  return this;
};
