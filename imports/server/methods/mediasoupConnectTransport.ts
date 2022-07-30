import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Flags from '../../Flags';
import ConnectRequests from '../../lib/models/mediasoup/ConnectRequests';
import Transports from '../../lib/models/mediasoup/Transports';
import mediasoupConnectTransport from '../../methods/mediasoupConnectTransport';
import { serverId } from '../garbage-collection';

mediasoupConnectTransport.define({
  validate(arg) {
    check(arg, {
      transportId: String,
      dtlsParameters: String,
    });
    return arg;
  },

  run({ transportId, dtlsParameters }) {
    if (!this.userId) {
      throw new Meteor.Error(401, 'Not logged in');
    }

    if (Flags.active('disable.webrtc')) {
      throw new Meteor.Error(403, 'WebRTC disabled');
    }

    const transport = Transports.findOne(transportId);
    if (!transport) {
      throw new Meteor.Error(404, 'Transport not found');
    }

    if (transport.createdBy !== this.userId) {
      throw new Meteor.Error(403, 'Not allowed');
    }

    ConnectRequests.insert({
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
