// base template. this doesn't work, and I don't know why, but it's not super
// impactful and I'll deal with it later
// import '../imports/client/head.html';

// explicitly import all the stuff from lib/ since mainModule skips autoloading
// things
import '../imports/lib/config/accounts.js';
import '../imports/lib/models/00index.js';
import '../imports/lib/models/announcements.js';
import '../imports/lib/models/chats.js';
import '../imports/lib/models/document_permissions.js';
import '../imports/lib/models/documents.js';
import '../imports/lib/models/feature_flags.js';
import '../imports/lib/models/guess.js';
import '../imports/lib/models/hunts.js';
import '../imports/lib/models/pending_announcements.js';
import '../imports/lib/models/profiles.js';
import '../imports/lib/models/proptypes.js';
import '../imports/lib/models/puzzles.js';
import '../imports/lib/models/tags.js';
import '../imports/lib/models/users.js';
import '../imports/lib/roles.js';

// Configure marked and moment
import '../imports/client/marked.js';
import '../imports/client/moment.js';

// explicitly import all the stuff from client/
import '../imports/client/main.jsx';
import '../imports/client/close.js';
