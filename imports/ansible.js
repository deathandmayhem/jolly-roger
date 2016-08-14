import { Meteor } from 'meteor/meteor';

const Ansible = {};

const logLevels = new Set(['log', 'info', 'error', 'warn']);
logLevels.forEach(l => {
  Ansible[l] = function (line, obj) {
    const args = [line];
    if (obj) {
      args.push(obj);
    }

    if (Meteor.isClient) {
      console[l](...args); // eslint-disable-line no-console
    }

    Meteor.call('ansible', l, ...args);
  };
});

export default Ansible;
