import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Flags from "../../Flags";
import ConnectRequests from "../../lib/models/mediasoup/ConnectRequests";
import Transports from "../../lib/models/mediasoup/Transports";
import mediasoupConnectTransport from "../../methods/mediasoupConnectTransport";
import serverId from "../serverId";
import defineMethod from "./defineMethod";

defineMethod(mediasoupConnectTransport, {
  validate(arg) {
    check(arg, {
      transportId: String,
      dtlsParameters: String,
    });
    return arg;
  },

  async run({ transportId, dtlsParameters }) {
    if (!this.userId) {
      throw new Meteor.Error(401, "Not logged in");
    }

    if (await Flags.activeAsync("disable.webrtc")) {
      throw new Meteor.Error(403, "WebRTC disabled");
    }

    const transport = await Transports.findOneAsync(transportId);
    if (!transport) {
      throw new Meteor.Error(404, "Transport not found");
    }

    if (transport.createdBy !== this.userId) {
      throw new Meteor.Error(403, "Not allowed");
    }

    await ConnectRequests.insertAsync({
      createdServer: serverId,
      routedServer: transport.createdServer,
      call: transport.call,
      peer: transport.peer,
      transportRequest: transport.transportRequest,
      direction: transport.direction,
      transport: transport._id,
      dtlsParameters,
    });
  },
});
