import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Flags from '../../Flags';
import Peers from '../../lib/models/mediasoup/Peers';
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

    const producerServer = await ProducerServers.findOneAsync({ producerId: mediasoupProducerId });
    if (!producerServer) {
      throw new Meteor.Error(404, 'Producer not found');
    }

    const producerClient = await ProducerClients.findOneAsync(producerServer.producerClient);
    if (!producerClient) {
      // This really shouldn't happen
      throw new Meteor.Error(500, 'Producer not found');
    }

    if (producerClient.createdBy !== this.userId) {
      throw new Meteor.Error(403, 'Not allowed');
    }

    const peer = await Peers.findOneAsync(producerClient.peer);
    if (peer?.remoteMutedBy) {
      throw new Meteor.Error(403, 'Peer has been remotely muted and must first acknowledge that');
    }

    await ProducerClients.updateAsync(producerClient, { $set: { paused } });
  },
});
