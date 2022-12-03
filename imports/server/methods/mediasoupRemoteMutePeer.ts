import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Flags from '../../Flags';
import PeerRemoteMutes from '../../lib/models/mediasoup/PeerRemoteMutes';
import Peers from '../../lib/models/mediasoup/Peers';
import ProducerClients from '../../lib/models/mediasoup/ProducerClients';
import mediasoupRemoteMutePeer from '../../methods/mediasoupRemoteMutePeer';

mediasoupRemoteMutePeer.define({
  validate(arg) {
    check(arg, {
      peerId: String,
    });
    return arg;
  },

  run({ peerId }) {
    if (!this.userId) {
      throw new Meteor.Error(401, 'Not logged in');
    }

    if (Flags.active('disable.webrtc')) {
      throw new Meteor.Error(403, 'WebRTC disabled');
    }

    const peer = Peers.findOne({ _id: peerId });
    if (!peer) {
      throw new Meteor.Error(404, 'Peer ID for remote peer not found');
    }

    const selfPeer = Peers.findOne({ call: peer.call, createdBy: this.userId });
    if (!selfPeer) {
      throw new Meteor.Error(404, "You can't mute a peer when you're not in the call");
    }

    if (peer.muted) {
      throw new Meteor.Error(403, 'Remote peer is already muted');
    }

    PeerRemoteMutes.insert({
      call: peer.call,
      peer: peer._id,
    });

    ProducerClients.update({
      peer: peer._id,
    }, {
      $set: {
        paused: true,
      },
    }, { multi: true });
    Peers.update(peer._id, {
      $set: {
        remoteMutedBy: this.userId,
        muted: true,
      },
    });
  },
});
