import { Mongo } from 'meteor/mongo';
import ServerSchema, { ServerType } from '../schemas/Server';

const Servers = new Mongo.Collection<ServerType>('jr_servers');
Servers.attachSchema(ServerSchema);

export default Servers;
