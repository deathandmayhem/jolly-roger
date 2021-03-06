// register all known migrations
import './1-basic-indexes';
import './2-lock-unique';
import './3-subscribers-indexes';
import './4-fix-subscribers-indexes';
import './5-pending-announcement-indexes';
import './6-open-signups';
import './7-more-indexes';
import './8-subscriber-servers-index';
import './9-remove-old-profile-fields';
import './10-rename-hunt-slack-field';
import './11-api-keys-indexes';
import './12-doc-perms-indexes';
import './13-display-names-index';
import './14-fix-display-names-index';
import './15-backfill-chat-base-props';
import './16-feature-flag-indexes';
import './17-update-documents-provider';
import './18-rename-gdrive-template';
import './19-subscribers-name-index';
import './20-puzzle-multiple-answers';
import './21-puzzle-remove-single-answers';
import './22-unset-slack-handles';
import './23-serviceconfigurations-remove-slack';
import './24-hunts-remove-slack-fields';
import './25-remove-slack-featureflag';
import './26-remove-subcounter-feature-flags';
import './27-hunt-has-guess-queue';
import './28-discord-cache-indexes';
import './29-fix-guild-setting-id';
import './30-index-call-participants';
import './31-index-call-signals';
import './32-index-chat-notifications';
import './33-index-profile-dingwords';
