import { Meteor } from 'meteor/meteor';
import { Promise as MeteorPromise } from 'meteor/promise';
import Announcements from '../lib/models/Announcements';
import BlobMappings from '../lib/models/BlobMappings';
import DiscordCache from '../lib/models/DiscordCache';
import DiscordRoleGrants from '../lib/models/DiscordRoleGrants';
import FolderPermissions from '../lib/models/FolderPermissions';
import Hunts from '../lib/models/Hunts';
import { AllModels } from '../lib/models/Model';
import PendingAnnouncements from '../lib/models/PendingAnnouncements';
import Puzzles from '../lib/models/Puzzles';
import Tags from '../lib/models/Tags';
import CallHistories from '../lib/models/mediasoup/CallHistories';
import ConnectAcks from '../lib/models/mediasoup/ConnectAcks';
import ConnectRequests from '../lib/models/mediasoup/ConnectRequests';
import ConsumerAcks from '../lib/models/mediasoup/ConsumerAcks';
import Consumers from '../lib/models/mediasoup/Consumers';
import PeerRemoteMutes from '../lib/models/mediasoup/PeerRemoteMutes';
import Peers from '../lib/models/mediasoup/Peers';
import ProducerClients from '../lib/models/mediasoup/ProducerClients';
import ProducerServers from '../lib/models/mediasoup/ProducerServers';
import Rooms from '../lib/models/mediasoup/Rooms';
import Routers from '../lib/models/mediasoup/Routers';
import TransportRequests from '../lib/models/mediasoup/TransportRequests';
import TransportStates from '../lib/models/mediasoup/TransportStates';
import Transports from '../lib/models/mediasoup/Transports';
import Announcement from '../lib/schemas/Announcement';
import BlobMapping from '../lib/schemas/BlobMapping';
import DiscordCacheSchema from '../lib/schemas/DiscordCache';
import DiscordRoleGrant from '../lib/schemas/DiscordRoleGrant';
import FolderPermission from '../lib/schemas/FolderPermission';
import Hunt from '../lib/schemas/Hunt';
import PendingAnnouncement from '../lib/schemas/PendingAnnouncement';
import Puzzle from '../lib/schemas/Puzzle';
import Tag from '../lib/schemas/Tag';
import User from '../lib/schemas/User';
import CallHistory from '../lib/schemas/mediasoup/CallHistory';
import ConnectAck from '../lib/schemas/mediasoup/ConnectAck';
import ConnectRequest from '../lib/schemas/mediasoup/ConnectRequest';
import Consumer from '../lib/schemas/mediasoup/Consumer';
import ConsumerAck from '../lib/schemas/mediasoup/ConsumerAck';
import Peer from '../lib/schemas/mediasoup/Peer';
import PeerRemoteMute from '../lib/schemas/mediasoup/PeerRemoteMute';
import ProducerClient from '../lib/schemas/mediasoup/ProducerClient';
import ProducerServer from '../lib/schemas/mediasoup/ProducerServer';
import Room from '../lib/schemas/mediasoup/Room';
import Router from '../lib/schemas/mediasoup/Router';
import Transport from '../lib/schemas/mediasoup/Transport';
import TransportRequest from '../lib/schemas/mediasoup/TransportRequest';
import TransportState from '../lib/schemas/mediasoup/TransportState';
import attachSchema from './attachSchema';
import APIKeys from './models/APIKeys';
import Blobs from './models/Blobs';
import CallActivities from './models/CallActivities';
import DriveActivityLatests from './models/DriveActivityLatests';
import HuntFolders from './models/HuntFolders';
import Locks from './models/Locks';
import Subscribers from './models/Subscribers';
import UploadTokens from './models/UploadTokens';
import APIKey from './schemas/APIKey';
import Blob from './schemas/Blob';
import CallActivity from './schemas/CallActivity';
import DriveActivityLatest from './schemas/DriveActivityLatest';
import HuntFolder from './schemas/HuntFolder';
import Lock from './schemas/Lock';
import Subscriber from './schemas/Subscriber';
import UploadToken from './schemas/UploadToken';

Announcements.attachSchema(Announcement);
BlobMappings.attachSchema(BlobMapping);
DiscordCache.attachSchema(DiscordCacheSchema);
DiscordRoleGrants.attachSchema(DiscordRoleGrant);
FolderPermissions.attachSchema(FolderPermission);
Hunts.attachSchema(Hunt);
PendingAnnouncements.attachSchema(PendingAnnouncement);
Puzzles.attachSchema(Puzzle);
Tags.attachSchema(Tag);
CallHistories.attachSchema(CallHistory);
ConnectAcks.attachSchema(ConnectAck);
ConnectRequests.attachSchema(ConnectRequest);
ConsumerAcks.attachSchema(ConsumerAck);
Consumers.attachSchema(Consumer);
PeerRemoteMutes.attachSchema(PeerRemoteMute);
Peers.attachSchema(Peer);
ProducerClients.attachSchema(ProducerClient);
ProducerServers.attachSchema(ProducerServer);
Rooms.attachSchema(Room);
Routers.attachSchema(Router);
TransportRequests.attachSchema(TransportRequest);
Transports.attachSchema(Transport);
TransportStates.attachSchema(TransportState);
APIKeys.attachSchema(APIKey);
Blobs.attachSchema(Blob);
CallActivities.attachSchema(CallActivity);
DriveActivityLatests.attachSchema(DriveActivityLatest);
HuntFolders.attachSchema(HuntFolder);
Locks.attachSchema(Lock);
Subscribers.attachSchema(Subscriber);
UploadTokens.attachSchema(UploadToken);

Meteor.startup(() => {
  // We want this to be synchronous, so that if it fails we crash the
  // application (better than having no schema in place). We should be able to
  // eliminate this if Meteor backports support for async startup functions (as
  // requested in https://github.com/meteor/meteor/discussions/12468)
  MeteorPromise.await((async () => {
    for (const model of AllModels.values()) {
      await attachSchema(model.schema, model.collection);
    }
    // Note: this will fail type checking if our schema for User gets out of sync
    // with the type declaration for Meteor.User. (This could happen if we change
    // our extensions to Meteor.User in imports/lib/schemas/User.ts but is more
    // likely to happen if Meteor upstream changes their type declaration.)
    await attachSchema(User, Meteor.users);
  })());
});
