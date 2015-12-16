const summaryFromLoginInfo = function(info) {
  switch (info.methodName) {
  case 'login':
    const email = info.methodArguments &&
      info.methodArguments[0] &&
      info.methodArguments[0].user &&
      info.methodArguments[0].user.email;
    return {
      msg: 'User logged in',
      email,
    };
  case 'resetPassword':
    /* We can't tell if this is a reset or an enrollment, because the
       user object already reflects the changed state. Womp womp */
    return {
      msg: 'User reset password and logged in',
      email: info.user.emails[0].address,
    };
  default:
    Ansible.warn('Received login hook from unknown method', {method: info.methodName});
    return {
      msg: 'User logged in by unknown method',
      email: info.user.emails[0].address,
      method: info.methodName,
    };
  }
};

Accounts.onLogin((info) => {
  const summary = _.extend(summaryFromLoginInfo(info), {
    user: info.user._id,
    ip: info.connection.clientAddress,
  });

  Ansible.log(summary.msg, _.omit(summary, 'msg'));
});

Accounts.onLoginFailure((info) => {
  const email = info.methodArguments &&
    info.methodArguments[0] &&
    info.methodArguments[0].user &&
    info.methodArguments[0].user.email;
  Ansible.log('Failed login attempt', {
    user: info.user._id,
    email: email,
    ip: info.connection.clientAddress,
    error: info.error.reason,
  });
});

Accounts.urls.enrollAccount = (token) => Meteor.absoluteUrl('enroll/' + token);
Accounts.urls.resetPassword = (token) => Meteor.absoluteUrl('reset-password/' + token);

// Get an account to trigger enrollment. If there's no account for the
// email address, create one. Otherwise if the existing account
// doesn't have a password set, return that. Otherwise, throw an error
// - you can't re-enroll when a password is already set
const accountForEnrollment = function(email) {
  try {
    return Accounts.createUser({email});
  } catch (e) {
    if (e.reason !== 'Email already exists.') {
      throw e;
    }

    const user = Accounts.findUserByEmail(email);

    // User already has a password set, so they should reset it themselves
    if (user.services &&
        user.services.password &&
        user.services.password.bcrypt) {
      throw e;
    }

    return user;
  }
};

Meteor.methods({
  sendInvite(email) {
    check(email, String);

    // this.connection is null for server calls, which we allow
    if (!this.userId && this.connection) {
      throw new Meteor.Error(403, 'Must be logged in');
    }

    const id = accountForEnrollment(email);
    Accounts.sendEnrollmentEmail(id);

    Ansible.info('Invited new user', {invitedBy: this.userId, email});
  },
});
