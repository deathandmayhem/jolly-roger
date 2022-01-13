import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Ansible from '../ansible';
import Flags from '../flags';
import CallHistories from '../lib/models/mediasoup/call_histories';
import ConnectAcks from '../lib/models/mediasoup/connect_acks';
import ConnectRequests from '../lib/models/mediasoup/connect_requests';
import ConsumerAcks from '../lib/models/mediasoup/consumer_acks';
import Consumers from '../lib/models/mediasoup/consumers';
import Peers from '../lib/models/mediasoup/peers';
import ProducerClients from '../lib/models/mediasoup/producer_clients';
import ProducerServers from '../lib/models/mediasoup/producer_servers';
import Rooms from '../lib/models/mediasoup/rooms';
import Routers from '../lib/models/mediasoup/routers';
import TransportRequests from '../lib/models/mediasoup/transport_requests';
import TransportStates from '../lib/models/mediasoup/transport_states';
import Transports from '../lib/models/mediasoup/transports';
import Servers from '../lib/models/servers';
import { checkAdmin, userMayJoinCallsForHunt } from '../lib/permission_stubs';
import { registerPeriodicCleanupHook, serverId } from './garbage-collection';
import ignoringDuplicateKeyErrors from './ignoringDuplicateKeyErrors';
import Locks from './models/lock';

registerPeriodicCleanupHook((deadServers) => {
  Peers.remove({ createdServer: { $in: deadServers } });

  // Deleting a room creates a potential inconsistency, since we might still
  // have peers on other servers. Therefore, take out a lock to make sure we
  // see a consistent view (and everyone else does too), then check if there
  // are still peers joined to this room
  Rooms.find({ routedServer: { $in: deadServers } }).forEach((room) => {
    Locks.withLock(`mediasoup:room:${room.call}`, () => {
      if (!Rooms.remove(room._id)) {
        return;
      }

      const peer = Peers.findOne({ call: room.call });
      if (peer) {
        ignoringDuplicateKeyErrors(() => {
          Rooms.insert({
            hunt: room.hunt,
            call: room.call,
            routedServer: serverId,
            createdBy: peer.createdBy,
          });
        });
      }
    });
  });
});

Meteor.publish('mediasoup:debug', function () {
  if (!this.userId) {
    throw new Meteor.Error(401, 'Not logged in');
  }

  checkAdmin(this.userId);

  return [
    Servers.find(),
    CallHistories.find(),
    Peers.find(),
    Rooms.find(),
    Routers.find(),
    TransportRequests.find(),
    Transports.find(),
    TransportStates.find(),
    ConnectRequests.find(),
    ConnectAcks.find(),
    ProducerClients.find(),
    ProducerServers.find(),
    Consumers.find(),
    ConsumerAcks.find(),
  ];
});

Meteor.publish('mediasoup:metadata', function (hunt, call) {
  check(hunt, String);
  check(call, String);

  if (!this.userId) {
    throw new Meteor.Error(401, 'Not logged in');
  }

  if (!userMayJoinCallsForHunt(this.userId, hunt)) {
    throw new Meteor.Error(403, 'Not a member of this hunt');
  }

  return [
    Peers.find({ hunt, call }),
    CallHistories.find({ hunt, call }),
  ];
});

Meteor.publish('mediasoup:join', function (hunt, call, tab) {
  check(hunt, String);
  check(call, String);
  check(tab, String);

  if (!this.userId) {
    throw new Meteor.Error(401, 'Not logged in');
  }

  if (!userMayJoinCallsForHunt(this.userId, hunt)) {
    throw new Meteor.Error(403, 'Not a member of this hunt');
  }

  if (Flags.active('disable.webrtc')) {
    throw new Meteor.Error(403, 'WebRTC disabled');
  }

  let peerId: string;
  Locks.withLock(`mediasoup:room:${call}`, () => {
    if (!Rooms.findOne({ call })) {
      Rooms.insert({
        hunt,
        call,
        routedServer: serverId,
      });
    }

    // Before trying to join the room, remove any existing peer record from the
    // same tab.
    //
    // This shouldn't happen most of the time, but can happen if the server
    // crashes or the client gets disconnected and reconnects (possibly to a
    // different server) before the server that served the client's previous
    // session notices.
    //
    // In the event we see such a record in the DB, we can safely remove it. Since
    // the tabId alone should not get reissued by different clients, we can be
    // sure that the client no longer trusts that the previous `call.join` is
    // active, and we can just take this as a signal to hasten that cleanup.
    // If the room is not yet created, create it.
    Peers.remove({ hunt, call, tab });

    peerId = Peers.insert({
      createdServer: serverId,
      hunt,
      call,
      tab,
      muted: false,
      deafened: false,
    });

    Ansible.log('Peer joined call', { peer: peerId, call, createdBy: this.userId });
  });

  this.onStop(() => {
    Locks.withLock(`mediasoup:room:${call}`, () => {
      Peers.remove(peerId);

      // If the room is empty, remove it.
      if (!Peers.findOne({ call })) {
        Rooms.remove({ call });
      }
    });
  });

  return [
    Rooms.find({ call }),
    Routers.find({ call }),
    Peers.find({ call }),
  ];
});

Meteor.publish('mediasoup:transports', function (peerId, rtpCapabilities) {
  check(peerId, String);
  check(rtpCapabilities, String);

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

  const router = Routers.findOne({ call: peer.call });
  if (!router) {
    throw new Meteor.Error(404, 'Router not found');
  }

  if (peer.createdBy !== this.userId) {
    throw new Meteor.Error(403, 'Not allowed');
  }

  const transportRequest = TransportRequests.insert({
    createdServer: serverId,
    routedServer: router.createdServer,
    call: peer.call,
    peer: peer._id,
    rtpCapabilities,
  });

  this.onStop(() => {
    TransportRequests.remove(transportRequest);
    ConnectRequests.remove({ transportRequest });
    ConnectAcks.remove({ transportRequest });
    ConsumerAcks.remove({ transportRequest });
  });

  return [
    TransportRequests.find(transportRequest),
    Transports.find({ transportRequest }),
    ConnectRequests.find({ transportRequest }),
    ConnectAcks.find({ transportRequest }),
    Consumers.find({ transportRequest }),
    ConsumerAcks.find({ transportRequest }),
  ];
});

Meteor.publish('mediasoup:producer', function (transportId, trackId, kind, rtpParameters) {
  check(transportId, String);
  check(trackId, String);
  check(kind, Match.OneOf('audio', 'video'));
  check(rtpParameters, String);

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

  const producerClientId = ProducerClients.insert({
    createdServer: serverId,
    routedServer: transport.createdServer,
    call: transport.call,
    peer: transport.peer,
    transport: transport._id,
    transportRequest: transport.transportRequest,
    trackId,
    kind,
    rtpParameters,
    paused: false,
  });

  this.onStop(() => {
    ProducerClients.remove(producerClientId);
  });

  return [
    ProducerClients.find(producerClientId),
    ProducerServers.find({ producerClient: producerClientId }),
  ];
});

// The three participant states permitted by peer_set_state fan out to two
// boolean properties on the document:
//
//         | active | muted | deafened |
// --------+--------+-------+----------+
//    muted|  false |  true |   true   |
// --------+--------+-------+----------+
// deafened|  false | false |   true   |
// --------+--------+-------+----------+
const ALLOWED_STATES = ['active', 'muted', 'deafened'] as const;

Meteor.methods({
  'mediasoup:peer_set_state': function (peerId, state) {
    check(peerId, String);
    check(state, Match.OneOf(...ALLOWED_STATES));

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

  'mediasoup:transport_connect': function (transportId, dtlsParameters) {
    check(transportId, String);
    check(dtlsParameters, String);

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

  'mediasoup:producer_set_paused': function (mediasoupProducerId, paused) {
    check(mediasoupProducerId, String);
    check(paused, Boolean);

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

  'mediasoup:consumer_ack': function (consumerId) {
    check(consumerId, String);

    if (!this.userId) {
      throw new Meteor.Error(401, 'Not logged in');
    }

    if (Flags.active('disable.webrtc')) {
      throw new Meteor.Error(403, 'WebRTC disabled');
    }

    const consumer = Consumers.findOne(consumerId);
    if (!consumer) {
      throw new Meteor.Error(404, 'Consumer not found');
    }

    if (consumer.createdBy !== this.userId) {
      throw new Meteor.Error(403, 'Not allowed');
    }

    ConsumerAcks.insert({
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
