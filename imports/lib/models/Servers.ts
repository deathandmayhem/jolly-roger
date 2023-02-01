import Server from '../schemas/Server';
import type { ModelType } from './Model';
import Model from './Model';

const Servers = new Model('jr_servers', Server);
export type ServerType = ModelType<typeof Servers>;

export default Servers;
