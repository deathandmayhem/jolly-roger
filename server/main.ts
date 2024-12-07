// First thing's first: setup error reporting and logging
import "../imports/server/bugsnag";
import "../imports/server/configureLogger";

// setup database management
import "../imports/server/schemas";
import "../imports/server/indexes";
import "../imports/server/migrations-run";

// explicitly import all the stuff from lib/ since mainModule skips autoloading
// things
import "../imports/lib/config/accounts";

// Register migrations
import "../imports/server/migrations/all";

// Set up multi-process load balancer
import "../imports/server/loadBalance";

// Import methods and publications
import "../imports/server/methods/index";
import "../imports/server/publications/index";

// Other stuff in the server folder
import "../imports/server/accounts";
import "../imports/server/api-init";
import "../imports/server/chat-notifications";
import "../imports/server/discord";
import "../imports/server/discordClientRefresher";
import "../imports/server/gdriveActivityFetcher";
import "../imports/server/assets";
import "../imports/server/browserconfig";
import "../imports/server/site-manifest";
import "../imports/server/server-render";
import "../imports/server/setup";
import "../imports/server/subscribers";
import "../imports/server/users";
import "../imports/server/userStatuses";
import "../imports/server/mediasoup";
import "../imports/server/mediasoup-api";

// Imports are necessary to make sure the modules are in the bundle
import ModelsFacade from "../imports/lib/models/facade";

(global as any).Models = ModelsFacade;

// Very last thing: run latest build hooks to actually create indexes and
// schemas
// eslint-disable-next-line import/first
import "../imports/server/runLatestBuildHooks";
