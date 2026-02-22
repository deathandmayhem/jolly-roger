import HooksRegistry from "./hooks/HooksRegistry";

// Instantiate the application-global hookset list.
const GlobalHooks = new HooksRegistry();

// To avoid import cycles, we register hook sets separately in register-hooks.ts

export default GlobalHooks;
