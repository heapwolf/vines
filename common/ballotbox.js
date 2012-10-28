//
// ballotbox is a collection type that implements a
// quorum-based voting commit protocol.
//
//
var BallotBox = module.exports = 
  function BallotBox(elections, total, min, deadline) {

  if(!(this instanceof BallotBox)) {
    return new BallotBox(elections, total, min, deadline);
  }

  this.elections = elections || {};
  this.results = {};
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
// @value {Boolean} true for `commit` or false for `abort`
//
BallotBox.prototype.vote = function(uuid, topic, value) {

  //
  // you cant vote on elections that already have results.
  //
  if (this.results[topic]) {
    return false;
  }

  this.elections[topic] = this.elections[topic] || { votes: {} };

  if(!this.elections[topic].votes) {
    this.elections[topic].votes = {};
  }

  this.elections[topic].votes[uuid] = value;

  return this.decide(topic, uuid);
};

BallotBox.prototype.mergeVotes = function(topic, election, uuid) {

  //
  // merge in the votes from an election not yet held on this peer.
  //
  if (this.elections[topic]) {

    var votes = election.votes;

    for(var uuid in votes) {
      this.elections[topic].votes[uuid] = votes[uuid];
    }
  }
  else {
    this.elections[topic] = election;
  }

  return this.decide(topic, uuid);
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
BallotBox.prototype.decide = function(topic, uuid) {

  //
  // if a decision has already been made, return false.
  //
  if (this.results[topic]) {
    return false; 
  }
  var election = this.elections[topic];
  var votes = election.votes;
  var deadline = election.deadline;
  var total = election.total;
  var min = election.min;

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

  var now = new Date(Date.now());

  if (now > deadline) {

    //
    // if the current date/time is greater than the 
    // deadline, this is an automatic win for aborting.
    //
    return this.results[topic] = {
      result: false,
      uuid: uuid
    };
  }

  //
  // ensure that a transaction cannot be committed and 
  // aborted at the same time.
  //

  if (V >= total) {

    if (Vc === Va) {
      return false;
    }

    var minimum = Vc >= min || Va >= min;

    //
    // if there are the minimum number of votes,
    // we can return an object that contains who is
    // responsible for making the decision and what 
    // the result of the decision was.
    //
    if (minimum) {

      var result = this.results[topic] = {
        result: Vc > Va,
        uuid: uuid
      };

      return result;
    }
  }

  return false;
};

//
// Establish the criteria for an election.
//
// @total {Number} the total number of systems known
// @min {Number} minimum votes needed to satisfy an election
// @deadline {String} represents a serialized future date
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
  this.elections[opts.topic].min = opts.min || 1;
  this.elections[opts.topic].total = opts.total || 1;
  this.elections[opts.topic].deadline = opts.deadline || new Date(Date.now());

  return this;
};
