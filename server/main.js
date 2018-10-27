// explicitly import all the stuff from lib/ since mainModule skips autoloading
// things
import '../imports/lib/config/accounts.js';
import '../imports/lib/models/proptypes.js';
import '../imports/lib/models/users.js';
import '../imports/lib/roles.js';

// Register migrations
import '../imports/server/migrations/all.js';

// Other stuff in the server folder
import '../imports/server/accounts.js';
import '../imports/server/announcements.js';
import '../imports/server/ansible.js';
import '../imports/server/api-init.js';
import '../imports/server/api_keys.js';
import '../imports/server/chat.js';
import '../imports/server/feature_flags.js';
import '../imports/server/fixture.js';
import '../imports/server/gdrive-init.js';
import '../imports/server/git_revision.js';
import '../imports/server/guesses.js';
import '../imports/server/hunts.js';
import '../imports/server/migrations-run.js'; // runs migrations
import '../imports/server/observability.js';
import '../imports/server/profile.js';
import '../imports/server/puzzle.js';
import '../imports/server/server-render.js';
import '../imports/server/setup.js';
import '../imports/server/slack-methods.js';
import '../imports/server/subscribers.js';
import '../imports/server/operator.js';
import '../imports/server/users.js';

// Load facades for convenient shell access.
import Schemas from '../imports/lib/schemas/facade.js'; // eslint-disable-line no-unused-vars
import Models from '../imports/lib/models/facade.js'; // eslint-disable-line no-unused-vars
