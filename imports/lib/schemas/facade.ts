import Announcement from './announcement';
import BlobMapping from './blob_mapping';
import CallParticipant from './call_participant';
import CallSignal from './call_signal';
import ChatMessage from './chat';
import ChatNotification from './chat_notification';
import DiscordCache from './discord_cache';
import DocumentSchema from './document';
import DocumentPermission from './document_permission';
import FeatureFlag from './feature_flag';
import Guess from './guess';
import Hunt from './hunt';
import PendingAnnouncement from './pending_announcement';
import Profile from './profile';
import PublicSetting from './public_setting';
import Puzzle from './puzzle';
import Server from './server';
import Setting from './setting';
import Tag from './tag';
import User from './user';

const Schemas = {
  Announcement,
  BlobMapping,
  CallParticipant,
  CallSignal,
  ChatMessage,
  ChatNotification,
  DiscordCache,
  DocumentPermission,
  Document: DocumentSchema,
  FeatureFlag,
  Guess,
  Hunt,
  PendingAnnouncement,
  Profile,
  PublicSetting,
  Puzzle,
  Server,
  Setting,
  Tag,
  User,
};

export default Schemas;
