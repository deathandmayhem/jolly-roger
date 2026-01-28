import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";

import Flags from "../../Flags";
import Peers from "../../lib/models/mediasoup/Peers";
import mediasoupSetPeerState, {
  ALLOWED_STATES,
} from "../../methods/mediasoupSetPeerState";
import defineMethod from "./defineMethod";

defineMethod(mediasoupSetPeerState, {
  validate(arg) {
    check(arg, {
      peerId: String,
      state: Match.OneOf(...ALLOWED_STATES),
    });

    return arg;
  },

  async run({ peerId, state }) {
    if (!this.userId) {
      throw new Meteor.Error(401, "Not logged in");
    }

    if (await Flags.activeAsync("disable.webrtc")) {
      throw new Meteor.Error(403, "WebRTC disabled");
    }

    const peer = await Peers.findOneAsync(peerId);
    if (!peer) {
      throw new Meteor.Error(404, "Peer not found");
    }

    if (peer.createdBy !== this.userId) {
      throw new Meteor.Error(403, "Not allowed");
    }

    await Peers.updateAsync(
      {
        _id: peerId,
        // If a user has been remote muted, they aren't allowed to change their
        // state until they acknowledge the remote mute
        remoteMutedBy: undefined,
      },
      {
        $set: {
          muted: state !== "active",
          deafened: state === "deafened",
        },
      },
    );
  },
});
