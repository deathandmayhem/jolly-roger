// explicitly import all the stuff from lib/ since mainModule skips autoloading
// things
import '../imports/lib/config/accounts';
import '../imports/lib/models/users';
import '../imports/lib/roles';

// Register migrations
import '../imports/server/migrations/all';

// Other stuff in the server folder
import '../imports/server/accounts';
import '../imports/server/announcements';
import '../imports/server/ansible';
import '../imports/server/api-init';
import '../imports/server/api_keys';
import '../imports/server/calls';
import '../imports/server/chat';
import '../imports/server/discord';
import '../imports/server/feature_flags';
import '../imports/server/fixture';
import '../imports/server/git_revision';
import '../imports/server/guesses';
import '../imports/server/hunts';
import '../imports/server/migrations-run'; // runs migrations
import '../imports/server/profile';
import '../imports/server/puzzle';
import '../imports/server/server-render';
import '../imports/server/setup';
import '../imports/server/subscribers';
import '../imports/server/operator';
import '../imports/server/users';
