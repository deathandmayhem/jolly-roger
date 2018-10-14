// explicitly import all the stuff from lib/ since mainModule skips autoloading
// things
import '/imports/lib/config/accounts.js';
import '/imports/lib/models/00index.js';
import '/imports/lib/models/announcements.js';
import '/imports/lib/models/chats.js';
import '/imports/lib/models/document_permissions.js';
import '/imports/lib/models/documents.js';
import '/imports/lib/models/feature_flags.js';
import '/imports/lib/models/guess.js';
import '/imports/lib/models/hunts.js';
import '/imports/lib/models/pending_announcements.js';
import '/imports/lib/models/profiles.js';
import '/imports/lib/models/proptypes.js';
import '/imports/lib/models/puzzles.js';
import '/imports/lib/models/tags.js';
import '/imports/lib/models/users.js';
import '/imports/lib/roles.js';

// explicitly import server-only models
import '/imports/server/models/api_keys.js';
import '/imports/server/models/lock.js';
import '/imports/server/models/settings.js';
import '/imports/server/models/subscribers.js';

// register migrations
import '/imports/server/migrations/1-basic-indexes.js';
import '/imports/server/migrations/2-lock-unique.js';
import '/imports/server/migrations/3-subscribers-indexes.js';
import '/imports/server/migrations/4-fix-subscribers-indexes.js';
import '/imports/server/migrations/5-pending-announcement-indexes.js';
import '/imports/server/migrations/6-open-signups.js';
import '/imports/server/migrations/7-more-indexes.js';
import '/imports/server/migrations/8-subscriber-servers-index.js';
import '/imports/server/migrations/9-remove-old-profile-fields.js';
import '/imports/server/migrations/10-rename-hunt-slack-field.js';
import '/imports/server/migrations/11-api-keys-indexes.js';
import '/imports/server/migrations/12-doc-perms-indexes.js';
import '/imports/server/migrations/13-display-names-index.js';
import '/imports/server/migrations/14-fix-display-names-index.js';
import '/imports/server/migrations/15-backfill-chat-base-props.js';
import '/imports/server/migrations/16-feature-flag-indexes.js';
import '/imports/server/migrations/17-update-documents-provider.js';
import '/imports/server/migrations/18-rename-gdrive-template.js';
import '/imports/server/migrations/19-subscribers-name-index.js';

// Other stuff in the server folder
import '/imports/server/accounts.js';
import '/imports/server/announcements.js';
import '/imports/server/ansible.js';
import '/imports/server/api-init.js';
import '/imports/server/api_keys.js';
import '/imports/server/chat.js';
import '/imports/server/feature_flags.js';
import '/imports/server/fixture.js';
import '/imports/server/gdrive-init.js';
import '/imports/server/git_revision.js';
import '/imports/server/guesses.js';
import '/imports/server/hunts.js';
import '/imports/server/global-hooks.js'; // previously index.js
import '/imports/server/migrations-run.js'; // runs migrations
import '/imports/server/observability.js';
import '/imports/server/profile.js';
import '/imports/server/puzzle.js';
import '/imports/server/setup.js';
import '/imports/server/slack-methods.js';
import '/imports/server/users.js';
