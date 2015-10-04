Accounts.onLogin((info) => {
  if (info.type === 'resume') {
    return;
  }

  Ansible.log("User logged in", {
    user: info.user._id,
    email: info.methodArguments[0].user.email,
    ip: info.connection.clientAddress
  });
});

Accounts.onLoginFailure((info) => {
  Ansible.log('Failed login attempt', {
    user: info.user._id,
    email: info.methodArguments[0].user.email,
    ip: info.connection.clientAddress,
    error: info.error.reason
  });
});
