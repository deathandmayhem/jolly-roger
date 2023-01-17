import { Mongo } from 'meteor/mongo';
import type { ServerType } from '../schemas/Server';

const Servers = new Mongo.Collection<ServerType>('jr_servers');

export default Servers;
