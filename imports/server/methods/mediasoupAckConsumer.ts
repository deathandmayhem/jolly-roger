import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";

import Flags from "../../Flags";
import ConsumerAcks from "../../lib/models/mediasoup/ConsumerAcks";
import Consumers from "../../lib/models/mediasoup/Consumers";
import mediasoupAckConsumer from "../../methods/mediasoupAckConsumer";
import { serverId } from "../garbage-collection";
import defineMethod from "./defineMethod";

defineMethod(mediasoupAckConsumer, {
  validate(arg) {
    check(arg, {
      consumerId: String,
    });
    return arg;
  },

  async run({ consumerId }) {
    if (!this.userId) {
      throw new Meteor.Error(401, "Not logged in");
    }

    if (await Flags.activeAsync("disable.webrtc")) {
      throw new Meteor.Error(403, "WebRTC disabled");
    }

    const consumer = await Consumers.findOneAsync(consumerId);
    if (!consumer) {
      throw new Meteor.Error(404, "Consumer not found");
    }

    if (consumer.createdBy !== this.userId) {
      throw new Meteor.Error(403, "Not allowed");
    }

    await ConsumerAcks.insertAsync({
      createdServer: serverId,
      routedServer: consumer.createdServer,
      call: consumer.call,
      peer: consumer.peer,
      transportRequest: consumer.transportRequest,
      consumer: consumer._id,
      producerId: consumer.producerId,
    });
  },
});
