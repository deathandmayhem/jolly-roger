import HooksRegistry from './hooks/hooks-registry.js';
import SlackHooks from './hooks/slack-hooks.js';

// Instantiate the application-global hookset list.
const GlobalHooks = new HooksRegistry();
// Add all hooksets.  Right now that's just Slack.
GlobalHooks.addHookSet(new SlackHooks());

export default GlobalHooks;
