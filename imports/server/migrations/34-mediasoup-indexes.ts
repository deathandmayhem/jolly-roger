import { Migrations } from 'meteor/percolate:migrations';
import ConnectAcks from '../../lib/models/mediasoup/ConnectAcks';
import ConnectRequests from '../../lib/models/mediasoup/ConnectRequests';
import ConsumerAcks from '../../lib/models/mediasoup/ConsumerAcks';
import Consumers from '../../lib/models/mediasoup/Consumers';
import Peers from '../../lib/models/mediasoup/Peers';
import ProducerClients from '../../lib/models/mediasoup/ProducerClients';
import ProducerServers from '../../lib/models/mediasoup/ProducerServers';
import Rooms from '../../lib/models/mediasoup/Rooms';
import Routers from '../../lib/models/mediasoup/Routers';
import TransportRequests from '../../lib/models/mediasoup/TransportRequests';
import TransportStates from '../../lib/models/mediasoup/TransportStates';
import Transports from '../../lib/models/mediasoup/Transports';

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
