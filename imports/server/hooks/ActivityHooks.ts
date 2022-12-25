import { ACTIVITY_GRANULARITY } from '../../lib/config/activityTracking';
import ChatMessages from '../../lib/models/ChatMessages';
import roundedTime from '../../lib/roundedTime';
import ignoringDuplicateKeyErrors from '../ignoringDuplicateKeyErrors';
import RecentActivities from '../models/RecentActivities';
import Hookset from './Hookset';

const ActivityHooks: Hookset = {
  async onChatMessageCreated(chatMessageId: string) {
    const message = ChatMessages.findOne(chatMessageId);
    if (!message) return;

    const { sender } = message;
    if (!sender) return; // Ignore system messages

    await ignoringDuplicateKeyErrors(async () => {
      await RecentActivities.insertAsync({
        hunt: message.hunt,
        puzzle: message.puzzle,
        user: sender,
        ts: roundedTime(ACTIVITY_GRANULARITY, message.createdAt),
        type: 'chat',
      });
    });
  },
};

export default ActivityHooks;
