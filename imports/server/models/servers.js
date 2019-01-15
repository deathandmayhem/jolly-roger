import { Meteor } from 'meteor/meteor';
import ServersSchema from '../schemas/servers';

const Servers = new class extends Meteor.Collection {
  constructor() {
    super('jr_servers');
  }
}();
Servers.attachSchema(ServersSchema);

export default Servers;
