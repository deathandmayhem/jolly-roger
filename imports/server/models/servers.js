import { Meteor } from 'meteor/meteor';
import ServersSchema from '../schemas/servers.js';

const Servers = new class extends Meteor.Collection {
  constructor() {
    super('jr_servers');
  }
}();
Servers.attachSchema(ServersSchema);

export default Servers;
