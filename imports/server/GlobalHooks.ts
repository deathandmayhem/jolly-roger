import DingwordHooks from './hooks/DingwordHooks';
import DiscordHooks from './hooks/DiscordHooks';
import HooksRegistry from './hooks/HooksRegistry';

// Instantiate the application-global hookset list.
const GlobalHooks = new HooksRegistry();
// Add all hooksets.
GlobalHooks.addHookSet(DiscordHooks);
GlobalHooks.addHookSet(DingwordHooks);

export default GlobalHooks;
