import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";

import Flags from "../../Flags";
import Peers from "../../lib/models/mediasoup/Peers";
import mediasoupAckPeerRemoteMute from "../../methods/mediasoupAckPeerRemoteMute";
import defineMethod from "./defineMethod";

defineMethod(mediasoupAckPeerRemoteMute, {
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
      throw new Meteor.Error(404, "Peer not found");
    }

    if (peer.createdBy !== this.userId) {
      throw new Meteor.Error(403, "Not allowed");
    }

    await Peers.updateAsync(peer._id, {
      $set: {
        muted: true,
      },
      $unset: {
        remoteMutedBy: 1,
      },
    });
  },
});
