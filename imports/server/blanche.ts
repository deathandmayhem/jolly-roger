import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import * as child from 'child_process';
import Ansible from '../ansible';

const execFile = Meteor.wrapAsync(child.execFile);

const blanche = (args: string[]): string => {
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
  public name: string;

  constructor(name: string) {
    this.name = name;
  }

  members(): string[] {
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

  add(member: string): boolean {
    try {
      blanche([this.name, '-a', member]);
      return true;
    } catch (e) {
      return false;
    }
  }
}

export default List;
