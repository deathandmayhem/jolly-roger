import { Mongo } from 'meteor/mongo';
import ServersSchema, { ServerType } from '../schemas/servers';

const Servers = new Mongo.Collection<ServerType>('jr_servers');
Servers.attachSchema(ServersSchema);

export default Servers;
