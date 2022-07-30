import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Flags from '../../Flags';
import Peers from '../../lib/models/mediasoup/Peers';
import mediasoupSetPeerState, { ALLOWED_STATES } from '../../methods/mediasoupSetPeerState';

mediasoupSetPeerState.define({
  validate(arg) {
    check(arg, {
      peerId: String,
      state: Match.OneOf(...ALLOWED_STATES),
    });

    return arg;
  },

  run({ peerId, state }) {
    if (!this.userId) {
      throw new Meteor.Error(401, 'Not logged in');
    }

    if (Flags.active('disable.webrtc')) {
      throw new Meteor.Error(403, 'WebRTC disabled');
    }

    const peer = Peers.findOne(peerId);
    if (!peer) {
      throw new Meteor.Error(404, 'Peer not found');
    }

    if (peer.createdBy !== this.userId) {
      throw new Meteor.Error(403, 'Not allowed');
    }

    Peers.update(peerId, {
      $set: {
        muted: state !== 'active',
        deafened: state === 'deafened',
      },
    });
  },
});
