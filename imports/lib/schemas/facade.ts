import Announcement from './announcement';
import BlobMapping from './blob_mapping';
import ChatMessage from './chat';
import ChatNotification from './chat_notification';
import DiscordCache from './discord_cache';
import DocumentSchema from './document';
import FeatureFlag from './feature_flag';
import FolderPermission from './folder_permission';
import Guess from './guess';
import Hunt from './hunt';
import CallHistory from './mediasoup/call_history';
import ConnectAck from './mediasoup/connect_ack';
import ConnectRequest from './mediasoup/connect_request';
import Consumer from './mediasoup/consumer';
import ConsumerAck from './mediasoup/consumer_ack';
import Peer from './mediasoup/peer';
import ProducerClient from './mediasoup/producer_client';
import ProducerServer from './mediasoup/producer_server';
import Room from './mediasoup/room';
import Router from './mediasoup/router';
import Transport from './mediasoup/transport';
import TransportRequest from './mediasoup/transport_request';
import TransportState from './mediasoup/transport_state';
import PendingAnnouncement from './pending_announcement';
import Profile from './profile';
import Puzzle from './puzzle';
import Server from './server';
import Setting from './setting';
import Tag from './tag';
import User from './user';

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
    ProducerClient,
    ProducerServer,
    Room,
    Router,
    Transport,
    TransportRequest,
    TransportState,
  },
  PendingAnnouncement,
  Profile,
  Puzzle,
  Server,
  Setting,
  Tag,
  User,
};

export default Schemas;
