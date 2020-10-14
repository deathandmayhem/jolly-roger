import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import moment from 'moment';
import CallParticipants from '../lib/models/call_participants';
import CallSignals from '../lib/models/call_signals';

const serverId = Random.id();

// Swap this to true if debugging participant/signal GC
const debug = false;

const cleanup = function () {
  const timeout = moment().subtract('120', 'seconds').toDate();

  // TODO: remove CallParticipants from dead server backends.
  // Consider unifying with cleanup logic from Subscriptions.

  // Remove old CallSignals that both:
  // 1) were created more than 2 minutes (server delay) ago *and*
  // 2) have a reference to a participant ID no longer found in CallParticipants
  const liveParticipants = CallParticipants.find({}).map((doc) => doc._id);
  const deadSignals = CallSignals.remove({
    $and: [
      { createdAt: { $lt: timeout } },
      {
        $or: [
          { sender: { $nin: liveParticipants } },
          { target: { $nin: liveParticipants } },
        ],
      },
    ],
  });

  if (debug) {
    // eslint-disable-next-line no-console
    console.log(`Removed ${deadSignals} dead signals`);
  }
};

const periodic = function () {
  // Attempt to refresh our server record every 30 seconds (with
  // jitter). We should have 4 periods before we get GC'd mistakenly.
  Meteor.setTimeout(periodic, 15000 + (15000 * Random.fraction()));
  cleanup();
};

Meteor.methods({
  signalPeer(selfParticipantId: unknown, peerParticipantId: unknown, args: unknown) {
    check(this.userId, String);
    check(selfParticipantId, String);
    check(peerParticipantId, String);
    check(args, {
      type: String,
      content: String,
    });

    const selfParticipant = CallParticipants.findOne(selfParticipantId);
    if (!selfParticipant) {
      throw new Meteor.Error(404, `CallParticipant ${selfParticipantId} not found`);
    }

    if (selfParticipant.createdBy !== this.userId) {
      throw new Meteor.Error(401, `CallParticipant ${selfParticipantId} not created by ${this.userId}`);
    }

    const peerParticipant = CallParticipants.findOne(peerParticipantId);
    if (!peerParticipant) {
      throw new Meteor.Error(404, `CallParticipant ${peerParticipantId} not found`);
    }

    if (args.type === 'sdp') {
      CallSignals.upsert({
        sender: selfParticipantId,
        target: peerParticipantId,
      }, {
        $push: { messages: { type: 'sdp', content: args.content } },
      });
    } else if (args.type === 'iceCandidate') {
      CallSignals.upsert({
        sender: selfParticipantId,
        target: peerParticipantId,
      }, {
        $push: { messages: { type: 'iceCandidate', content: args.content } },
      });
    } else {
      throw new Meteor.Error(400, `Expected args.type to be either 'sdp' or 'iceCandidate' but got '${args.type}'`);
    }
  },
});

Meteor.publish('call.join', function (hunt, call, tab) {
  check(hunt, String);
  check(call, String);
  check(tab, String);

  if (!this.userId) {
    throw new Meteor.Error(401, 'Not logged in');
  }

  // TODO: determine call participant ID deterministically for the
  // (this.userId, hunt, call, tab) tuple, so that server disconnections
  // allow for recovery on reconnect
  const callParticipant = {
    server: serverId,
    hunt,
    call,
    tab,
  };

  const doc = CallParticipants.insert(callParticipant);
  this.onStop(() => {
    // Remove the participant
    CallParticipants.remove(doc);
    // Also remove any signalling documents they created.
    CallSignals.remove({
      $or: [
        { sender: doc },
        { target: doc },
      ],
    });
  });

  return CallParticipants.find({
    hunt,
    call,
  });
});

Meteor.publish('call.signal', function (callerParticipantId) {
  check(callerParticipantId, String);

  if (!this.userId) {
    throw new Meteor.Error(401, 'Not logged in');
  }

  const callerParticipant = CallParticipants.findOne(callerParticipantId);
  if (!callerParticipant) {
    throw new Meteor.Error(401, `CallParticipant ${callerParticipantId} not found`);
  }

  // Only allow the creator of the CallParticipant to subscribe to signaling
  // for that peer.
  if (callerParticipant.createdBy !== this.userId) {
    throw new Meteor.Error(401, `CallParticipant ${callerParticipantId} not created by ${this.userId}`);
  }

  return CallSignals.find({ target: callerParticipantId });
});

Meteor.startup(() => periodic());
