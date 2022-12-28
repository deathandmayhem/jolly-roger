import { check } from 'meteor/check';
import MeteorUsers from '../../lib/models/MeteorUsers';
import unlinkUserDiscordAccount from '../../methods/unlinkUserDiscordAccount';

unlinkUserDiscordAccount.define({
  run() {
    check(this.userId, String);

    // TODO: tell Discord to revoke the token?

    // Remove token (secret) from the user object in the database.
    await MeteorUsers.updateAsync(this.userId, {
      $unset: { 'services.discord': '' },
    });

    // Remove display name from user's profile object.
    await MeteorUsers.updateAsync(this.userId, { $unset: { discordAccount: 1 } });
  },
});
