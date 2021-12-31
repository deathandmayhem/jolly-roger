import { Mongo } from 'meteor/mongo';
import ServerSchema, { ServerType } from '../schemas/server';

const Servers = new Mongo.Collection<ServerType>('jr_servers');
Servers.attachSchema(ServerSchema);

export default Servers;
