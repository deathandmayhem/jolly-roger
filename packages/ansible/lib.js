Ansible = {};

logLevels = new Set(['log', 'info', 'error', 'warn']);
logLevels.forEach(l => {
  Ansible[l] = function (line, obj) {
    args = [line];
    if (obj) {
      args.push(obj);
    }

    if (Meteor.isClient) {
      console[l](...args);
    }

    Meteor.call('ansible', l, ...args);
  };
});
