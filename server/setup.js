Roles.registerAction('gdrive.credential', true);

Meteor.methods({
  setupGdriveCreds(key, secret) {
    check(this.userId, String);
    check(key, String);
    check(secret, String);
    Role.checkPermission(this.userId, 'gdrive.credential');

    const credential = Google.retrieveCredential(key, secret);
    Models.Settings.upsert({name: 'gdrive.credential'}, {$set: {value: credential}});
    Ansible.log('Updated Gdrive creds', {email: credential.serviceData.email, user: this.userId});
  },
});
