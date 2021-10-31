import Announcment from './announcement';
import CallParticipant from './call_participant';
import CallSignal from './call_signal';
import ChatNotification from './chat_notification';
import ChatMessage from './chat';
import DocumentPermission from './document_permission';
import DocumentSchema from './document';
import FeatureFlag from './feature_flag';
import Guess from './guess';
import Hunt from './hunt';
import PendingAnnouncement from './pending_announcement';
import Profile from './profile';
import PublicSetting from './public_setting';
import Puzzle from './puzzle';
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
  FeatureFlag,
  Guess,
  Hunt,
  PendingAnnouncement,
  Profile,
  PublicSetting,
  Puzzle,
  Tags,
  User,
};

export default Schemas;
