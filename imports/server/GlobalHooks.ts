import ActivityHooks from './hooks/ActivityHooks';
import ChatHooks from './hooks/ChatHooks';
import DingwordHooks from './hooks/DingwordHooks';
import DiscordHooks from './hooks/DiscordHooks';
import HooksRegistry from './hooks/HooksRegistry';
import TagCleanupHooks from './hooks/TagCleanupHooks';

// Instantiate the application-global hookset list.
const GlobalHooks = new HooksRegistry();
// Add all hooksets.
GlobalHooks.addHookSet(ActivityHooks);
GlobalHooks.addHookSet(DiscordHooks);
GlobalHooks.addHookSet(DingwordHooks);
GlobalHooks.addHookSet(TagCleanupHooks);
GlobalHooks.addHookSet(ChatHooks);

export default GlobalHooks;
