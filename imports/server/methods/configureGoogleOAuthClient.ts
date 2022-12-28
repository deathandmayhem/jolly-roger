import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { ServiceConfiguration } from 'meteor/service-configuration';
import Ansible from '../../Ansible';
import { userMayConfigureGoogleOAuth } from '../../lib/permission_stubs';
import configureGoogleOAuthClient from '../../methods/configureGoogleOAuthClient';

configureGoogleOAuthClient.define({
  validate(arg) {
    check(arg, {
      clientId: String,
      secret: String,
    });
    return arg;
  },

  run({ clientId, secret }) {
    check(this.userId, String);

    if (!userMayConfigureGoogleOAuth(this.userId)) {
      throw new Meteor.Error(401, 'Must be admin to configure Google OAuth');
    }

    Ansible.log('Configuring google oauth client', {
      clientId,
      user: this.userId,
    });
    await ServiceConfiguration.configurations.upsertAsync({ service: 'google' }, {
      $set: {
        clientId,
        secret,
        loginStyle: 'popup',
      },
    });
  },
});
