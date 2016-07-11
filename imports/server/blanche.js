import { Meteor } from 'meteor/meteor';
import child from 'child_process';

const execFile = Meteor.wrapAsync(child.execFile);

const blanche = (args, cb) => {
  try {
    return execFile('blanche', args, {stdio: ['ignore', 'pipe', process.stderr]});
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e;
    }

    Ansible.warn('Would run blanche, but it\'s not available', {args: args});
    return '';
  }
};

class List {
  constructor(name) {
    this.name = name;
  }

  members() {
    const out = blanche([this.name]);
    return _.compact(_.map(out.trim().split('\n'), (member) => {
      // Technically some of these are probably type STRING, but the
      // distinction isn't important here
      let type = 'USER';
      if (member.indexOf(':') !== -1) {
        [type, member] = member.split(':');
      }

      if (member.indexOf('@') === -1) {
        member += '@mit.edu';
      }

      switch (type) {
      case 'USER':
      case 'LIST':
        return member;
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

export { List };
