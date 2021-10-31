import Announcment from './announcement';
import CallParticipant from './call_participant';
import CallSignal from './call_signal';
import ChatNotification from './chat_notification';
import ChatMessage from './chat';
import DocumentPermission from './document_permission';
import DocumentSchema from './document';
import FeatureFlags from './feature_flags';
import Guesses from './guess';
import Hunts from './hunts';
import PendingAnnouncements from './pending_announcements';
import Profiles from './profiles';
import Puzzles from './puzzles';
import Tags from './tags';
import User from './users';

const Schemas = {
  Announcment,
  CallParticipant,
  CallSignal,
  ChatMessage,
  ChatNotification,
  DocumentPermission,
  Document: DocumentSchema,
  FeatureFlags,
  Guesses,
  Hunts,
  PendingAnnouncements,
  Profiles,
  Puzzles,
  Tags,
  User,
};

export default Schemas;
