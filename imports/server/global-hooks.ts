import HooksRegistry from './hooks/hooks-registry';

// Instantiate the application-global hookset list.
const GlobalHooks = new HooksRegistry();
// Add all hooksets.  There are currently no hook implementations.

export default GlobalHooks;
