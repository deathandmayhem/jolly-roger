import HooksRegistry from './hooks/hooks-registry';
import SlackHooks from './hooks/slack-hooks';

// Instantiate the application-global hookset list.
const GlobalHooks = new HooksRegistry();
// Add all hooksets.  Right now that's just Slack.
GlobalHooks.addHookSet(SlackHooks);

export default GlobalHooks;
