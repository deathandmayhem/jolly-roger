import DiscordHooks from './hooks/discord-hooks';
import HooksRegistry from './hooks/hooks-registry';

// Instantiate the application-global hookset list.
const GlobalHooks = new HooksRegistry();
// Add all hooksets.  Right now that's just Discord.
GlobalHooks.addHookSet(DiscordHooks);

export default GlobalHooks;
