import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";

import Flags from "../../Flags";
import PeerRemoteMutes from "../../lib/models/mediasoup/PeerRemoteMutes";
import Peers from "../../lib/models/mediasoup/Peers";
import ProducerClients from "../../lib/models/mediasoup/ProducerClients";
import mediasoupRemoteMutePeer from "../../methods/mediasoupRemoteMutePeer";
import defineMethod from "./defineMethod";

defineMethod(mediasoupRemoteMutePeer, {
  validate(arg) {
    check(arg, {
      peerId: String,
    });
    return arg;
  },

  async run({ peerId }) {
    if (!this.userId) {
      throw new Meteor.Error(401, "Not logged in");
    }

    if (await Flags.activeAsync("disable.webrtc")) {
      throw new Meteor.Error(403, "WebRTC disabled");
    }

    const peer = await Peers.findOneAsync({ _id: peerId });
    if (!peer) {
      throw new Meteor.Error(404, "Peer ID for remote peer not found");
    }

    const selfPeer = await Peers.findOneAsync({
      call: peer.call,
      createdBy: this.userId,
    });
    if (!selfPeer) {
      throw new Meteor.Error(
        404,
        "You can't mute a peer when you're not in the call",
      );
    }

    if (peer.muted) {
      throw new Meteor.Error(403, "Remote peer is already muted");
    }

    await PeerRemoteMutes.insertAsync({
      call: peer.call,
      peer: peer._id,
    });

    await ProducerClients.updateAsync(
      {
        peer: peer._id,
      },
      {
        $set: {
          paused: true,
        },
      },
      { multi: true },
    );
    await Peers.updateAsync(peer._id, {
      $set: {
        remoteMutedBy: this.userId,
        muted: true,
      },
    });
  },
});
