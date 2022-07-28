import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Flags from '../../Flags';
import ProducerClients from '../../lib/models/mediasoup/ProducerClients';
import ProducerServers from '../../lib/models/mediasoup/ProducerServers';
import mediasoupSetProducerPaused from '../../methods/mediasoupSetProducerPaused';

mediasoupSetProducerPaused.define({
  validate(arg) {
    check(arg, {
      mediasoupProducerId: String,
      paused: Boolean,
    });
    return arg;
  },

  run({ mediasoupProducerId, paused }) {
    if (!this.userId) {
      throw new Meteor.Error(401, 'Not logged in');
    }

    if (Flags.active('disable.webrtc')) {
      throw new Meteor.Error(403, 'WebRTC disabled');
    }

    const producerServer = ProducerServers.findOne({ producerId: mediasoupProducerId });
    if (!producerServer) {
      throw new Meteor.Error(404, 'Producer not found');
    }

    const producerClient = ProducerClients.findOne(producerServer.producerClient);
    if (!producerClient) {
      // This really shouldn't happen
      throw new Meteor.Error(500, 'Producer not found');
    }

    if (producerClient.createdBy !== this.userId) {
      throw new Meteor.Error(403, 'Not allowed');
    }

    ProducerClients.update(producerClient, { $set: { paused } });
  },
});
