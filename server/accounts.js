Accounts.onLogin((info) => {
  if (info.type === 'resume') {
    return;
  }

  Ansible.log('User logged in', {
    user: info.user._id,
    email: info.methodArguments[0].user.email,
    ip: info.connection.clientAddress,
  });
});

Accounts.onLoginFailure((info) => {
  Ansible.log('Failed login attempt', {
    user: info.user._id,
    email: info.methodArguments[0].user.email,
    ip: info.connection.clientAddress,
    error: info.error.reason,
  });
});

Meteor.methods({
  signup(email) {
    check(email, String);

    // this.connection is null for server calls, which we allow
    if (!this.userId && this.connection) {
      throw new Meteor.Error(403, 'Must be logged in');
    }

    Ansible.info('Inviting new user', {invitedBy: this.userId, email});

    const id = Accounts.createUser({email});
    Accounts.sendEnrollmentEmail(id);
  },
});
