import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import child from 'child_process';
import Ansible from '/imports/ansible.js';

const execFile = Meteor.wrapAsync(child.execFile);

const blanche = (args) => {
  try {
    return execFile('blanche', args, { stdio: ['ignore', 'pipe', process.stderr] });
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e;
    }

    Ansible.warn('Would run blanche, but it\'s not available', { args });
    return '';
  }
};

class List {
  constructor(name) {
    this.name = name;
  }

  members() {
    const out = blanche([this.name]);
    return _.compact(_.map(out.trim().split('\n'), (line) => {
      // Technically some of these are probably type STRING, but the
      // distinction isn't important here
      let type = 'USER';
      let member = line;
      if (line.indexOf(':') !== -1) {
        [type, member] = line.split(':');
      }

      if (member.indexOf('@') === -1) {
        member += '@mit.edu';
      }

      switch (type) {
        case 'USER':
        case 'LIST':
          return member;
        default:
          return undefined;
      }
    }));
  }

  add(member) {
    try {
      blanche([this.name, '-a', member]);
      return true;
    } catch (e) {
      return false;
    }
  }
}

export default List;
