/* eslint-disable filenames/match-exported */
import Announcement from './Announcement';
import BlobMapping from './BlobMapping';
import ChatMessage from './ChatMessage';
import ChatNotification from './ChatNotification';
import DiscordCache from './DiscordCache';
import DocumentSchema from './Document';
import FeatureFlag from './FeatureFlag';
import FolderPermission from './FolderPermission';
import Guess from './Guess';
import Hunt from './Hunt';
import PendingAnnouncement from './PendingAnnouncement';
import Puzzle from './Puzzle';
import Server from './Server';
import Setting from './Setting';
import Tag from './Tag';
import User from './User';
import CallHistory from './mediasoup/CallHistory';
import ConnectAck from './mediasoup/ConnectAck';
import ConnectRequest from './mediasoup/ConnectRequest';
import Consumer from './mediasoup/Consumer';
import ConsumerAck from './mediasoup/ConsumerAck';
import Peer from './mediasoup/Peer';
import PeerRemoteMute from './mediasoup/PeerRemoteMute';
import ProducerClient from './mediasoup/ProducerClient';
import ProducerServer from './mediasoup/ProducerServer';
import Room from './mediasoup/Room';
import Router from './mediasoup/Router';
import Transport from './mediasoup/Transport';
import TransportRequest from './mediasoup/TransportRequest';
import TransportState from './mediasoup/TransportState';

const Schemas = {
  Announcement,
  BlobMapping,
  ChatMessage,
  ChatNotification,
  DiscordCache,
  FolderPermission,
  Document: DocumentSchema,
  FeatureFlag,
  Guess,
  Hunt,
  MediaSoup: {
    CallHistory,
    ConnectAck,
    ConnectRequest,
    Consumer,
    ConsumerAck,
    Peer,
    PeerRemoteMute,
    ProducerClient,
    ProducerServer,
    Room,
    Router,
    Transport,
    TransportRequest,
    TransportState,
  },
  PendingAnnouncement,
  Puzzle,
  Server,
  Setting,
  Tag,
  User,
};

export default Schemas;
