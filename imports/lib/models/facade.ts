import Announcements from './announcements';
import BlobMappings from './blob_mappings';
import ChatNotifications from './chat_notifications';
import ChatMessages from './chats';
import DiscordCache from './discord_cache';
import Documents from './documents';
import FeatureFlags from './feature_flags';
import FolderPermissions from './folder_permissions';
import Guesses from './guesses';
import Hunts from './hunts';
import ConnectAcks from './mediasoup/connect_acks';
import ConnectRequests from './mediasoup/connect_requests';
import ConsumerAcks from './mediasoup/consumer_acks';
import Consumers from './mediasoup/consumers';
import Peers from './mediasoup/peers';
import ProducerClients from './mediasoup/producer_clients';
import ProducerServers from './mediasoup/producer_servers';
import Rooms from './mediasoup/rooms';
import Routers from './mediasoup/routers';
import TransportRequests from './mediasoup/transport_requests';
import TransportStates from './mediasoup/transport_states';
import Transports from './mediasoup/transports';
import PendingAnnouncements from './pending_announcements';
import Profiles from './profiles';
import Puzzles from './puzzles';
import Servers from './servers';
import Settings from './settings';
import Tags from './tags';

const Models = {
  Announcements,
  BlobMappings,
  ChatMessages,
  ChatNotifications,
  DiscordCache,
  Documents,
  FeatureFlags,
  FolderPermissions,
  Guesses,
  Hunts,
  MediaSoup: {
    ConsumerAcks,
    Consumers,
    ConnectAcks,
    ConnectRequests,
    Peers,
    ProducerClients,
    ProducerServers,
    Rooms,
    Routers,
    Transports,
    TransportRequests,
    TransportStates,
  },
  PendingAnnouncements,
  Profiles,
  Puzzles,
  Servers,
  Settings,
  Tags,
};

export default Models;
