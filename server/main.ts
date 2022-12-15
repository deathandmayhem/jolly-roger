// explicitly import all the stuff from lib/ since mainModule skips autoloading
// things
import '../imports/lib/config/accounts';

// Register migrations
import '../imports/server/migrations/all';

// Set up multi-process load balancer
import '../imports/server/loadBalance';

// Import methods
import '../imports/server/methods/index';

// Other stuff in the server folder
import '../imports/server/accounts';
import '../imports/server/announcements';
import '../imports/server/api-init';
import '../imports/server/sendChatMessageInternal';
import '../imports/server/chat-notifications';
import '../imports/server/discord';
import '../imports/server/discordClientRefresher';
import '../imports/server/gdriveDocumentWatcher';
import '../imports/server/guesses';
import '../imports/server/assets';
import '../imports/server/browserconfig';
import '../imports/server/site-manifest';
import '../imports/server/migrations-run'; // runs migrations
import '../imports/server/server-render';
import '../imports/server/setup';
import '../imports/server/subscribers';
import '../imports/server/users';
import '../imports/server/mediasoup';
import '../imports/server/mediasoup-api';

// Imports are necessary to make sure the modules are in the bundle
import ModelsFacade from '../imports/lib/models/facade';
import SchemasFacade from '../imports/lib/schemas/facade';

(global as any).Models = ModelsFacade;
(global as any).Schemas = SchemasFacade;
