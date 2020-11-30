import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import CallParticipants from '../lib/models/call_participants';
import CallSignals from '../lib/models/call_signals';
import { serverId, registerPeriodicCleanupHook } from './garbage-collection';

// Swap this to true if debugging participant/signal GC
const debug = false;

function cleanupHook(deadServers: string[]) {
  // Remove CallParticipants from dead server backends.
  CallParticipants.remove({ server: { $in: deadServers } });

  // Remove old CallSignals that reference a participant ID no longer found in CallParticipants
  const liveParticipants = CallParticipants.find({}).map((doc) => doc._id);
  const deadSignals = CallSignals.remove({
    $or: [
      { sender: { $nin: liveParticipants } },
      { target: { $nin: liveParticipants } },
    ],
  });

  if (debug) {
    // eslint-disable-next-line no-console
    console.log(`Removed ${deadSignals} dead signals`);
  }
}
registerPeriodicCleanupHook(cleanupHook);

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

  setMuted(selfParticipantId: unknown, muted: unknown) {
    check(this.userId, String);
    check(selfParticipantId, String);
    check(muted, Boolean);

    const selfParticipant = CallParticipants.findOne(selfParticipantId);
    if (!selfParticipant) {
      throw new Meteor.Error(404, `CallParticipant ${selfParticipantId} not found`);
    }

    if (selfParticipant.createdBy !== this.userId) {
      throw new Meteor.Error(401, `CallParticipant ${selfParticipantId} not created by ${this.userId}`);
    }

    CallParticipants.update({
      _id: selfParticipantId,
    }, {
      $set: {
        muted,
      },
    });
  },

  setDeafened(selfParticipantId: unknown, deafened: unknown) {
    check(this.userId, String);
    check(selfParticipantId, String);
    check(deafened, Boolean);

    const selfParticipant = CallParticipants.findOne(selfParticipantId);
    if (!selfParticipant) {
      throw new Meteor.Error(404, `CallParticipant ${selfParticipantId} not found`);
    }

    if (selfParticipant.createdBy !== this.userId) {
      throw new Meteor.Error(401, `CallParticipant ${selfParticipantId} not created by ${this.userId}`);
    }

    CallParticipants.update({
      _id: selfParticipantId,
    }, {
      $set: {
        deafened,
      },
    });
  },
});

Meteor.publish('call.metadata', function (hunt, call) {
  check(hunt, String);
  check(call, String);

  if (!this.userId) {
    throw new Meteor.Error(401, 'Not logged in');
  }

  return CallParticipants.find({
    hunt,
    call,
  });
});

function cleanupCallSub(participantId: string) {
  // Remove the participant
  CallParticipants.remove(participantId);
  // Also remove any signalling documents they created.
  CallSignals.remove({
    $or: [
      { sender: participantId },
      { target: participantId },
    ],
  });
}

Meteor.publish('call.join', function (hunt, call, tab) {
  // This could notionally be a call, but making it a subscription means that
  // as soon as the user navigates away from the page or closes the window
  // we'll know to run the onStop(), which is good for faster propagation of
  // users leaving calls.
  check(hunt, String);
  check(call, String);
  check(tab, String);

  if (!this.userId) {
    throw new Meteor.Error(401, 'Not logged in');
  }

  // Check if we see evidence that this user has joined this call from the same
  // tab already.
  //
  // This shouldn't happen most of the time, but can happen if the server
  // crashes or the client gets disconnected and reconnects (possibly to a
  // different server) before the server that served the client's previous
  // session notices.
  //
  // In the event we see such a record in the DB, we can safely remove it.
  // Since the tabId alone should not get reissued by different clients, we can
  // be sure that the client no longer trusts that the previous `call.join` is active,
  // and we can just take this as a signal to hasten that cleanup.
  const maybeOldDoc = CallParticipants.findOne({
    hunt,
    call,
    tab,
    createdBy: this.userId,
  });
  if (maybeOldDoc) {
    cleanupCallSub(maybeOldDoc._id);
  }

  // TODO: determine call participant ID deterministically for the
  // (this.userId, hunt, call, tab) tuple, so that server disconnections
  // allow for recovery on reconnect?  I'm not sure that's actually safe
  // without updating serverId and checking that serverId matches when
  // removing, so maybe don't actually bother trying to make this
  // deterministic.
  const callParticipant = {
    server: serverId,
    hunt,
    call,
    tab,
    muted: false,
    deafened: false,
  };
  const doc = CallParticipants.insert(callParticipant);
  this.onStop(() => {
    cleanupCallSub(doc);
  });

  // Ensure this doc gets to the client before we mark this sub as ready
  return CallParticipants.find({ _id: doc });
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
