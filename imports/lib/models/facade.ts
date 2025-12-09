import Announcements from "./Announcements";
import BlobMappings from "./BlobMappings";
import Bookmarks from "./Bookmarks";
import ChatMessages from "./ChatMessages";
import ChatNotifications from "./ChatNotifications";
import DiscordCache from "./DiscordCache";
import DiscordRoleGrants from "./DiscordRoleGrants";
import DocumentActivities from "./DocumentActivities";
import Documents from "./Documents";
import FeatureFlags from "./FeatureFlags";
import FolderPermissions from "./FolderPermissions";
import Guesses from "./Guesses";
import Hunts from "./Hunts";
import CallHistories from "./mediasoup/CallHistories";
import ConnectAcks from "./mediasoup/ConnectAcks";
import ConnectRequests from "./mediasoup/ConnectRequests";
import ConsumerAcks from "./mediasoup/ConsumerAcks";
import Consumers from "./mediasoup/Consumers";
import PeerRemoteMutes from "./mediasoup/PeerRemoteMutes";
import Peers from "./mediasoup/Peers";
import ProducerClients from "./mediasoup/ProducerClients";
import ProducerServers from "./mediasoup/ProducerServers";
import Rooms from "./mediasoup/Rooms";
import Routers from "./mediasoup/Routers";
import TransportRequests from "./mediasoup/TransportRequests";
import TransportStates from "./mediasoup/TransportStates";
import Transports from "./mediasoup/Transports";
import PendingAnnouncements from "./PendingAnnouncements";
import Puzzles from "./Puzzles";
import Servers from "./Servers";
import Settings from "./Settings";
import Tags from "./Tags";

const Models = {
  Announcements,
  BlobMappings,
  Bookmarks,
  ChatMessages,
  ChatNotifications,
  DiscordCache,
  DiscordRoleGrants,
  DocumentActivities,
  Documents,
  FeatureFlags,
  FolderPermissions,
  Guesses,
  Hunts,
  MediaSoup: {
    CallHistories,
    ConsumerAcks,
    Consumers,
    ConnectAcks,
    ConnectRequests,
    Peers,
    PeerRemoteMutes,
    ProducerClients,
    ProducerServers,
    Rooms,
    Routers,
    Transports,
    TransportRequests,
    TransportStates,
  },
  PendingAnnouncements,
  Puzzles,
  Servers,
  Settings,
  Tags,
};

export default Models;
