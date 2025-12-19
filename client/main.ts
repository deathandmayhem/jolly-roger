// First thing's first: setup error reporting and logging
import "../imports/client/bugsnag";
import "../imports/client/configureLogger";

// Polyfills
import "disposablestack/auto";

// explicitly import all the stuff from lib/ since mainModule skips autoloading
// things
import "../imports/lib/config/accounts";

// explicitly import all the stuff from client/
import "../imports/client/main";
import "../imports/client/close";

declare global {
  interface Window {
    loadFacades: () => Promise<void>;
  }
}

window.loadFacades = async () => {
  const [models, tracing] = await Promise.all([
    import("../imports/lib/models/facade"),
    import("../imports/client/tracing"),
  ]);
  Object.defineProperty(window, "Models", { value: models.default });
  Object.defineProperty(window, "Tracing", { value: tracing });
};
