import DingwordHooks from './hooks/dingword-hooks';
import DiscordHooks from './hooks/discord-hooks';
import HooksRegistry from './hooks/hooks-registry';

// Instantiate the application-global hookset list.
const GlobalHooks = new HooksRegistry();
// Add all hooksets.
GlobalHooks.addHookSet(DiscordHooks);
GlobalHooks.addHookSet(DingwordHooks);

export default GlobalHooks;
