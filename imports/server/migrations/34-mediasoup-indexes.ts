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
import Migrations from './Migrations';

Migrations.add({
  version: 34,
  name: 'Add indexes to mediasoup collections',
  up() {
    await Rooms.createIndexAsync({ call: 1 }, { unique: true });
    await Rooms.createIndexAsync({ routedServer: 1 });

    await Routers.createIndexAsync({ call: 1 }, { unique: true });
    await Routers.createIndexAsync({ routerId: 1 });
    await Routers.createIndexAsync({ createdServer: 1 });

    await Peers.createIndexAsync({ hunt: 1, call: 1, tab: 1 }, { unique: true });
    await Peers.createIndexAsync({ call: 1, createdAt: 1 });
    await Peers.createIndexAsync({ createdServer: 1 });

    await TransportRequests.createIndexAsync({ createdServer: 1 });
    await TransportRequests.createIndexAsync({ routedServer: 1 });

    await Transports.createIndexAsync({ transportRequest: 1, direction: 1 }, { unique: true });
    await Transports.createIndexAsync({ transportId: 1 });
    await Transports.createIndexAsync({ createdServer: 1 });

    await TransportStates.createIndexAsync({ transportId: 1, createdServer: 1 }, { unique: true });
    await TransportStates.createIndexAsync({ transportId: 1 });

    await ConnectRequests.createIndexAsync({ transport: 1 }, { unique: true });
    await ConnectRequests.createIndexAsync({ createdServer: 1 });
    await ConnectRequests.createIndexAsync({ routedServer: 1 });
    await ConnectRequests.createIndexAsync({ peer: 1 });

    await ConnectAcks.createIndexAsync({ transport: 1 }, { unique: true });
    await ConnectAcks.createIndexAsync({ peer: 1 });
    await ConnectAcks.createIndexAsync({ createdServer: 1 });

    await ProducerClients.createIndexAsync({ transport: 1 });
    await ProducerClients.createIndexAsync({ createdServer: 1 });
    await ProducerClients.createIndexAsync({ routedServer: 1 });

    await ProducerServers.createIndexAsync({ producerClient: 1 }, { unique: true });
    await ProducerServers.createIndexAsync({ transport: 1 });
    await ProducerServers.createIndexAsync({ createdServer: 1 });
    await ProducerServers.createIndexAsync({ producerId: 1 });

    await Consumers.createIndexAsync({ peer: 1 });
    await Consumers.createIndexAsync({ consumerId: 1 });
    await Consumers.createIndexAsync({ createdServer: 1 });

    await ConsumerAcks.createIndexAsync({ consumer: 1 }, { unique: true });
    await ConsumerAcks.createIndexAsync({ peer: 1 });
    await ConsumerAcks.createIndexAsync({ createdServer: 1 });
  },
});
