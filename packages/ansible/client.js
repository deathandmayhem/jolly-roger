Ansible = {};

logLevels.forEach(l => {
  Ansible[l] = function (line, obj) {
    args = [line];
    if (obj) {
      args.push(obj);
    }
    console[l](...args);
    Meteor.call('ansible', l, ...args);
  };
});
