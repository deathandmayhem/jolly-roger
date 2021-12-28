import { Migrations } from 'meteor/percolate:migrations';
import ConnectAcks from '../../lib/models/mediasoup/connect_acks';
import ConnectRequests from '../../lib/models/mediasoup/connect_requests';
import ConsumerAcks from '../../lib/models/mediasoup/consumer_acks';
import Consumers from '../../lib/models/mediasoup/consumers';
import Peers from '../../lib/models/mediasoup/peers';
import ProducerClients from '../../lib/models/mediasoup/producer_clients';
import ProducerServers from '../../lib/models/mediasoup/producer_servers';
import Rooms from '../../lib/models/mediasoup/rooms';
import Routers from '../../lib/models/mediasoup/routers';
import TransportRequests from '../../lib/models/mediasoup/transport_requests';
import TransportStates from '../../lib/models/mediasoup/transport_states';
import Transports from '../../lib/models/mediasoup/transports';

Migrations.add({
  version: 34,
  name: 'Add indexes to mediasoup collections',
  up() {
    Rooms.createIndex({ call: 1 }, { unique: true });
    Rooms.createIndex({ routedServer: 1 });

    Routers.createIndex({ call: 1 }, { unique: true });
    Routers.createIndex({ routerId: 1 });
    Routers.createIndex({ createdServer: 1 });

    Peers.createIndex({ hunt: 1, call: 1, tab: 1 }, { unique: true });
    Peers.createIndex({ call: 1, createdAt: 1 });
    Peers.createIndex({ createdServer: 1 });

    TransportRequests.createIndex({ createdServer: 1 });
    TransportRequests.createIndex({ routedServer: 1 });

    Transports.createIndex({ transportRequest: 1, direction: 1 }, { unique: true });
    Transports.createIndex({ transportId: 1 });
    Transports.createIndex({ createdServer: 1 });

    TransportStates.createIndex({ transportId: 1, createdServer: 1 }, { unique: true });
    TransportStates.createIndex({ transportId: 1 });

    ConnectRequests.createIndex({ transport: 1 }, { unique: true });
    ConnectRequests.createIndex({ createdServer: 1 });
    ConnectRequests.createIndex({ routedServer: 1 });
    ConnectRequests.createIndex({ peer: 1 });

    ConnectAcks.createIndex({ transport: 1 }, { unique: true });
    ConnectAcks.createIndex({ peer: 1 });
    ConnectAcks.createIndex({ createdServer: 1 });

    ProducerClients.createIndex({ transport: 1 });
    ProducerClients.createIndex({ createdServer: 1 });
    ProducerClients.createIndex({ routedServer: 1 });

    ProducerServers.createIndex({ producerClient: 1 }, { unique: true });
    ProducerServers.createIndex({ transport: 1 });
    ProducerServers.createIndex({ createdServer: 1 });
    ProducerServers.createIndex({ producerId: 1 });

    Consumers.createIndex({ peer: 1 });
    Consumers.createIndex({ consumerId: 1 });
    Consumers.createIndex({ createdServer: 1 });

    ConsumerAcks.createIndex({ consumer: 1 }, { unique: true });
    ConsumerAcks.createIndex({ peer: 1 });
    ConsumerAcks.createIndex({ createdServer: 1 });
  },
});
